import React from 'react';
import styled from 'styled-components';

const Card: React.FC = ({ children }) => <StyledCard>{children}</StyledCard>;

const StyledCard = styled.div`
  background-color: #ffbdb475; //${(props) => props.theme.color.grey[800]};
  backdrop-filter: blur(15px);
  border: 1px solid #fff;
  border-radius: 10px !important;
  color: #2c2560 !important;
  display: flex;
  flex: 1;
  flex-direction: column;
`;

export default Card;
