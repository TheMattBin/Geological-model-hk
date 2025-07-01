import * as styles from './Background.module.css';
import PropTypes from 'prop-types';

const Background = ({ children }) => {
  return (
    <div className={styles.background}>
      <div className={styles.scroll}>{children}</div>
    </div>
  );
};

Background.propTypes = {
  children: PropTypes.node,
};

export default Background;
