import { ipcRenderer } from 'electron';
import fs from 'fs';
import Head from 'next/head';
import path from 'path';
import React, { useState } from 'react';
import Button from '../components/Button/Button';
import FileInput from '../components/FileInput/FileInput';
import Input from '../components/Input/Input';
import styles from '../sass/Index.module.scss';

function initProfiles(): VagrantProfile[] {
	if (typeof window === 'undefined') {
		return [];
	} else {
		const profilesFile = path?.join(ipcRenderer.sendSync('data-path'), 'profiles.json') || '';
		if (fs && !fs.existsSync(profilesFile)) {
			fs.writeFileSync(profilesFile, '[]');
		}
		const json = fs?.readFileSync(profilesFile).toString();
		return JSON.parse(json || '[]') as VagrantProfile[];
	}
}

function updateProfiles(profiles: VagrantProfile[]): void {
	if (typeof window !== 'undefined' && fs) {
		const profilesFile = path?.join(ipcRenderer.sendSync('data-path'), 'profiles.json') || '';
		if (!fs.existsSync(profilesFile)) {
			fs.writeFileSync(profilesFile, '[]');
		}
		fs.writeFileSync(profilesFile, JSON.stringify(profiles, null, 4));
	}
}

function getRunning(profiles: VagrantProfile[]): number | null {
	return ipcRenderer.sendSync('get-running', profiles);
}

const Index: React.FC = () => {
	const [profiles, setProfiles] = useState<VagrantProfile[]>(initProfiles());
	const [newName, setNewName] = useState<string>('');
	const [newPath, setNewPath] = useState<string>('');
	const [starting, setStarting] = useState<number | null>(null);
	const [running, setRunning] = useState<number | null>(getRunning(profiles));
	const [stopping, setStopping] = useState<number | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [alert, setAlert] = useState<string | null>(null);

	return (
		<div className={styles.main}>
			<Head>
				<title>Vagrant Launcher</title>
			</Head>
			<div className={styles.form}>
				<Input label="Profile Name" value={newName} onChange={(evt) => setNewName(evt.target.value)} />
				<FileInput file={newPath} onChange={(path) => setNewPath(path)} />
				<Button
					color="blue"
					onClick={() => {
						if (newName.trim().length !== 0 && newPath.trim().length !== 0) {
							if (profiles.find((profile) => profile.path === newPath)) {
								setNewPath('');
								setAlert('A Vagrant profile already exists for that folder!');
							} else {
								const newProfiles = [...profiles, { name: newName.trim(), path: newPath.trim().replace(path.sep + 'Vagrantfile', '') }];

								setProfiles(newProfiles);
								updateProfiles(newProfiles);

								setNewName('');
								setNewPath('');
							}
						}
					}}>
					Create Profile
				</Button>
			</div>
			<div className={styles.profiles}>
				{profiles.map((profile, i) => (
					<div className={styles.profile} key={profile.path}>
						<h4>{profile.name}</h4>
						<p>Path: {profile.path}</p>
						{running !== i ? (
							starting === i ? (
								<Button color="yellow">Starting...</Button>
							) : (
								<Button
									color="green"
									onClick={() => {
										ipcRenderer.send('launch', profile.path);

										new Promise<void>((resolve, reject) => {
											ipcRenderer.once('launch-reply', (_, arg) => {
												if (arg.type === 'success') {
													resolve();
												} else if (arg.type === 'disconnect') {
													reject(new Error('We have no idea what happened, but something went wrong...'));
												} else if (arg.type === 'error') {
													reject(new Error(arg.err));
												} else {
													reject(
														new Error(
															`We have no idea what happened, but something went wrong... very wrong...\n${JSON.stringify(arg)}`
														)
													);
												}
											});
										})
											.then(() => {
												setRunning(i);
												setStarting(null);
											})
											.catch((err) => {
												console.log(err);
												setErr(err.message);
												setRunning(getRunning(profiles));
												setStarting(null);
											});

										setStarting(i);
									}}>
									Start
								</Button>
							)
						) : stopping === i ? (
							<Button color="yellow">Stopping...</Button>
						) : (
							<Button
								color="red"
								onClick={() => {
									ipcRenderer.send('close', profile.path);

									new Promise<void>((resolve, reject) => {
										ipcRenderer.once('close-reply', (_, arg) => {
											if (arg.type === 'success') {
												resolve();
											} else if (arg.type === 'disconnect') {
												reject(new Error('We have no idea what happened, but something went wrong...'));
											} else if (arg.type === 'error') {
												reject(new Error(arg.err));
											} else {
												reject(
													new Error(`We have no idea what happened, but something went wrong... very wrong...\n${JSON.stringify(arg)}`)
												);
											}
										});
									})
										.then(() => {
											setRunning(null);
											setStopping(null);
										})
										.catch((err) => {
											console.log(err);
											setErr(err.message);
											setRunning(getRunning(profiles));
											setStopping(null);
										});

									setStopping(i);
								}}>
								Stop
							</Button>
						)}
					</div>
				))}
			</div>
			{err && (
				<>
					<div className={styles.popup}>
						Whoops! Bad shit happened:
						<div>{err}</div>
						<Button color="blue" onClick={() => setErr(null)}>
							Dismiss
						</Button>
					</div>
					<div className={styles.overlay} />
				</>
			)}
			{alert && (
				<>
					<div className={styles.popup}>
						<div>{alert}</div>
						<Button color="blue" onClick={() => setAlert(null)}>
							Dismiss
						</Button>
					</div>
					<div className={styles.overlay} />
				</>
			)}
		</div>
	);
};

export default Index;
