import * as styles from './Title.module.css';
import PropTypes from 'prop-types';

const Title = ({ text, size }) => {
  if (size === 'large') {
    return <h1 className={styles.titleBackground}>{text}</h1>;
  } else {
    return <h2 className={styles.titleBackground}>{text}</h2>;
  }
};

Title.propTypes = {
  text: PropTypes.string.isRequired,
  size: PropTypes.string,
};

export default Title;
