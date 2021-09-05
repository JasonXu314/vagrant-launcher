import cp from 'child_process';
import { app, ipcMain } from 'electron';
import serve from 'electron-serve';
import fs from 'fs';
import path from 'path';
import { createWindow } from './helpers';

const isProd: boolean = process.env.NODE_ENV === 'production';

if (isProd) {
	serve({ directory: 'app' });
} else {
	app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
	await app.whenReady();

	const launchBat = path.join(app.getPath('userData'), 'vagrant-launch.bat');
	if (!fs.existsSync(launchBat)) {
		fs.writeFileSync(launchBat, '@echo off\ncd /d %1\nvagrant up;');
	}
	const stopBat = path.join(app.getPath('userData'), 'vagrant-stop.bat');
	if (!fs.existsSync(stopBat)) {
		fs.writeFileSync(stopBat, '@echo off\ncd /d %1\nvagrant halt');
	}

	const mainWindow = createWindow('main', {
		width: 1000,
		height: 600
	});

	if (isProd) {
		await mainWindow.loadURL('app://./index.html');
	} else {
		const port = process.argv[2];

		ipcMain.on('launch', (evt, path: string) => {
			cp.spawn('vagrant-launch.bat', [path], { cwd: app.getPath('userData') })
				.on('close', (code) => {
					if (code === 0) {
						evt.sender.send('launch-reply', { type: 'success' });
					} else {
						evt.sender.send('launch-reply', { type: 'error', err: `Vagrant exited with exit code ${code}` });
					}
				})
				.on('disconnect', () => {
					evt.sender.send('launch-reply', { type: 'disconnect' });
				})
				.on('error', (err) => {
					evt.sender.send('launch-reply', { type: 'error', err });
				})
				.on('exit', (code) => {
					if (code === 0) {
						evt.sender.send('launch-reply', { type: 'success' });
					} else {
						evt.sender.send('launch-reply', { type: 'error', err: `Vagrant exited with exit code ${code}` });
					}
				})
				.on('message', (msg) => {
					console.log(msg);
				})
				.stdout.on('data', (data) => {
					console.log(data.toString());
				});
		});

		ipcMain.on('close', (evt, path: string) => {
			cp.spawn('vagrant-stop.bat', [path], { cwd: app.getPath('userData') })
				.on('close', (code) => {
					if (code === 0) {
						evt.sender.send('close-reply', { type: 'success' });
					} else {
						evt.sender.send('close-reply', { type: 'error', err: `Vagrant exited with exit code ${code}` });
					}
				})
				.on('disconnect', () => {
					evt.sender.send('close-reply', { type: 'disconnect' });
				})
				.on('error', (err) => {
					evt.sender.send('close-reply', { type: 'error', err });
				})
				.on('exit', (code) => {
					if (code === 0) {
						evt.sender.send('close-reply', { type: 'success' });
					} else {
						evt.sender.send('close-reply', { type: 'error', err: `Vagrant exited with exit code ${code}` });
					}
				})
				.on('message', (msg) => {
					console.log(msg);
				});
		});

		ipcMain.on('data-path', (evt) => {
			evt.returnValue = app.getPath('userData');
		});

		await mainWindow.loadURL(`http://localhost:${port}`);
		mainWindow.webContents.openDevTools();
	}
})();

app.on('window-all-closed', () => {
	app.quit();
});
