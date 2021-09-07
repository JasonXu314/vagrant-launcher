import React, { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.scss';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	hint?: string;
	color: 'red' | 'blue' | 'green' | 'yellow';
}

const Button: React.FC<React.PropsWithChildren<Props>> = ({ hint, color, children, ...rest }) => {
	return (
		<div className={styles.main}>
			<button className={styles.button + ' ' + styles[color]} {...rest}>
				{children}
			</button>
			{hint && <div className={styles.tooltip}>{hint}</div>}
		</div>
	);
};

export default Button;
