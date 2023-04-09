// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Note that this pool has no minter key of AARB (rewards).
// Instead, the governance will call ARB distributeReward method and send reward to this pool at the beginning.
contract AARBGenesisRewardPool is ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // governance
    address public operator;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many tokens the user has provided.
        uint256 rewardDebt; // Deposit debt. See explanation below.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 token; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. ARB to distribute.
        uint256 lastRewardTime; // Last time that ARB distribution occurs.
        uint256 accARBPerShare; // Accumulated ARB per share, times 1e18. See below.
        bool isStarted; // if lastRewardBlock has passed
    }

    IERC20 public arb;


    // Info of each pool.
    PoolInfo[] public poolInfo;

    // Info of each user that stakes tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;

    // The time when ARB mining starts.
    uint256 public poolStartTime;

    // The time when ARB mining ends.
    uint256 public poolEndTime;

    address public daoFundAddress;


    uint256 public rbPerSecond = 0.159143 ether; // 27500 ARB / (48h * 60min * 60s)
    uint256 public runningTime = 48 hours;
    uint256 public constant TOTAL_REWARDS = 27500 ether;


    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);

    constructor(
        address _rb,
        address _daoFund,
        uint256 _poolStartTime
    ) {
        require(block.timestamp < _poolStartTime, "late");
        if (_rb != address(0)) arb = IERC20(_rb);
        if (_daoFund != address(0)) daoFundAddress = _daoFund;

        poolStartTime = _poolStartTime;
        poolEndTime = poolStartTime + runningTime;
        operator = msg.sender;

    }

    modifier onlyOperator() {
        require(operator == msg.sender, "ARBGenesisPool: caller is not the operator");
        _;
    }

    function checkPoolDuplicate(IERC20 _token) internal view {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            require(poolInfo[pid].token != _token, "ARBGenesisPool: existing pool?");
        }
    }

    // Add a new pool. Can only be called by the owner.
    // @ _allocPoint - amount of rb this pool will emit
    // @ _token - token that can be deposited into this pool
    function add(
        uint256 _allocPoint,
        IERC20 _token,
        bool _withUpdate,
        uint256 _lastRewardTime
    ) public onlyOperator {
        checkPoolDuplicate(_token);
        if (_withUpdate) {
            massUpdatePools();
        }
        if (block.timestamp < poolStartTime) {
            // chef is sleeping
            if (_lastRewardTime == 0) {
                _lastRewardTime = poolStartTime;
            } else {
                if (_lastRewardTime < poolStartTime) {
                    _lastRewardTime = poolStartTime;
                }
            }
        } else {
            // chef is cooking
            if (_lastRewardTime == 0 || _lastRewardTime < block.timestamp) {
                _lastRewardTime = block.timestamp;
            }
        }
        bool _isStarted =
        (_lastRewardTime <= poolStartTime) ||
        (_lastRewardTime <= block.timestamp);
        poolInfo.push(PoolInfo({
        token : _token,
        allocPoint : _allocPoint,
        lastRewardTime : _lastRewardTime,
        accARBPerShare : 0,
        isStarted : _isStarted
        }));
        if (_isStarted) {
            totalAllocPoint = totalAllocPoint.add(_allocPoint);
        }
    }

    // Update the given pool's ARB allocation point. Can only be called by the owner.
    function set(uint256 _pid, uint256 _allocPoint) public onlyOperator {
        massUpdatePools();
        PoolInfo storage pool = poolInfo[_pid];
        if (pool.isStarted) {
            totalAllocPoint = totalAllocPoint.sub(pool.allocPoint).add(
                _allocPoint
            );
        }
        pool.allocPoint = _allocPoint;
    }

    // Return accumulate rewards over the given _from to _to block.
    function getGeneratedReward(uint256 _fromTime, uint256 _toTime) public view returns (uint256) {
        if (_fromTime >= _toTime) return 0;
        if (_toTime >= poolEndTime) {
            if (_fromTime >= poolEndTime) return 0;
            if (_fromTime <= poolStartTime) return poolEndTime.sub(poolStartTime).mul(rbPerSecond);
            return poolEndTime.sub(_fromTime).mul(rbPerSecond);
        } else {
            if (_toTime <= poolStartTime) return 0;
            if (_fromTime <= poolStartTime) return _toTime.sub(poolStartTime).mul(rbPerSecond);
            return _toTime.sub(_fromTime).mul(rbPerSecond);
        }
    }

    // View function to see pending ARB on frontend.
    function pendingARB(uint256 _pid, address _user) external view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accARBPerShare = pool.accARBPerShare;
        uint256 tokenSupply = pool.token.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTime && tokenSupply != 0) {
            uint256 _generatedReward = getGeneratedReward(pool.lastRewardTime, block.timestamp);
            uint256 _multiplyHelper =  _generatedReward.mul(pool.allocPoint); // intermidiate var to avoid multiply and division calc errors
            uint256 _rbReward = _multiplyHelper.div(totalAllocPoint);
            accARBPerShare = accARBPerShare.add(_rbReward.mul(1e18).div(tokenSupply));
        }
        // ok so all multiplication can go first and then all divisions go last....same 1 line like before
        return user.amount.mul(accARBPerShare).div(1e18).sub(user.rewardDebt);
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) private  {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        uint256 tokenSupply = pool.token.balanceOf(address(this));
        if (tokenSupply == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        if (!pool.isStarted) {
            pool.isStarted = true;
            totalAllocPoint = totalAllocPoint.add(pool.allocPoint);
        }
        if (totalAllocPoint > 0) {
            uint256 _generatedReward = getGeneratedReward(pool.lastRewardTime, block.timestamp);
            uint256 multiplyHelper = _generatedReward.mul(pool.allocPoint);
            uint256 _rbReward = multiplyHelper.div(totalAllocPoint);
            pool.accARBPerShare = pool.accARBPerShare.add(_rbReward.mul(1e18).div(tokenSupply));
        }
        pool.lastRewardTime = block.timestamp;
    }

    // Deposit tokens.

    function deposit(uint256 _pid, uint256 _amount) public nonReentrant {
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        updatePool(_pid);
        if (user.amount > 0) {
            // transfer rewards to user if any pending rewards
            uint256 _pending = user.amount.mul(pool.accARBPerShare).div(1e18).sub(user.rewardDebt);
            if (_pending > 0) {
                // send pending reward to user, if rewards accumulating in _pending
                safeARBTransfer(_sender, _pending);
                emit RewardPaid(_sender, _pending);
            }
        }
        if (_amount > 0) {
            pool.token.safeTransferFrom(_sender, address(this), _amount);
            uint256 depositDebt = _amount.mul(50).div(10000);
            user.amount = user.amount.add(_amount.sub(depositDebt));
            pool.token.safeTransfer(daoFundAddress, depositDebt);
        }
        user.rewardDebt = user.amount.mul(pool.accARBPerShare).div(1e18);
        emit Deposit(_sender, _pid, _amount);
    }

    // Withdraw tokens.
    function withdraw(uint256 _pid, uint256 _amount) public nonReentrant {
        address _sender = msg.sender;
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 _pending = user.amount.mul(pool.accARBPerShare).div(1e18).sub(user.rewardDebt);
        if (_pending > 0) {
            safeARBTransfer(_sender, _pending);
            emit RewardPaid(_sender, _pending);
        }
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.token.safeTransfer(_sender, _amount);

        }
        user.rewardDebt = user.amount.mul(pool.accARBPerShare).div(1e18);
        emit Withdraw(_sender, _pid, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        uint256 _amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        pool.token.safeTransfer(msg.sender, _amount);
        emit EmergencyWithdraw(msg.sender, _pid, _amount);
    }

    // Safe ARB transfer function, in case if rounding error causes pool to not have enough ARBs.
    function safeARBTransfer(address _to, uint256 _amount) internal {
        uint256 _rbBalance = arb.balanceOf(address(this));
        if (_rbBalance > 0) {
            if (_amount > _rbBalance) {
                arb.safeTransfer(_to, _rbBalance);
            } else {
                arb.safeTransfer(_to, _amount);
            }
        }
    }

    function setOperator(address _operator) external onlyOperator {
        operator = _operator;
    }
}