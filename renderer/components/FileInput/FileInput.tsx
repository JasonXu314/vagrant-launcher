import { InputHTMLAttributes, useState } from 'react';
import styles from './FileInput.module.scss';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
	file?: string;
	onChange: (file: string) => void;
};

const FileInput: React.FC<Props> = ({ id, file, onChange, className, ...rest }) => {
	const [dragging, setDragging] = useState<boolean>(false);

	return (
		<label
			className={styles.main + (dragging ? ' ' + styles.drag : '')}
			htmlFor={id}
			onDragEnter={(evt) => {
				evt.preventDefault();
				setDragging(true);
			}}
			onDragOver={(evt) => evt.preventDefault()}
			onDragLeave={() => setDragging(false)}
			onDrop={(evt) => {
				evt.preventDefault();

				const file = evt.dataTransfer.files.item(0);

				if (file?.name === 'Vagrantfile') {
					onChange(file.path);
				}

				setDragging(false);
			}}>
			<input
				{...rest}
				className={styles.input + (className ? ' ' + className : '')}
				type="file"
				name={id}
				onChange={(evt) => {
					const file = evt.target.files.item(0);

					if (file?.name === 'Vagrantfile') {
						onChange(file.path);
					}
				}}
			/>
			{file || 'Drag & Drop or click to select your Vagrantfile'}
		</label>
	);
};

export default FileInput;
