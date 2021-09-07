import cp from 'child_process';
import { app, ipcMain } from 'electron';
import serve from 'electron-serve';
import fs from 'fs';
import path from 'path';
import { createWindow } from './helpers';

const isProd: boolean = process.env.NODE_ENV === 'production';
const launchCmd = '@echo off\ncd /d %1\nvagrant up';
const stopCmd = '@echo off\ncd /d %1\nvagrant halt';
const statusCmd = '@echo off\ncd /d %1\nvagrant status';

if (isProd) {
	serve({ directory: 'app' });
} else {
	app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
	await app.whenReady();

	const launchBat = path.join(app.getPath('userData'), 'vagrant-launch.bat');
	if (!fs.existsSync(launchBat) || fs.readFileSync(launchBat).toString() !== launchCmd) {
		fs.writeFileSync(launchBat, launchCmd);
	}
	const stopBat = path.join(app.getPath('userData'), 'vagrant-stop.bat');
	if (!fs.existsSync(stopBat) || fs.readFileSync(stopBat).toString() !== stopCmd) {
		fs.writeFileSync(stopBat, stopCmd);
	}
	const statusBat = path.join(app.getPath('userData'), 'vagrant-status.bat');
	if (!fs.existsSync(statusBat) || fs.readFileSync(statusBat).toString() !== statusCmd) {
		fs.writeFileSync(statusBat, statusCmd);
	}

	const mainWindow = createWindow('main', {
		width: 1000,
		height: 600
	});

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

	ipcMain.on('get-running', (evt, profiles: VagrantProfile[]) => {
		const statuses = profiles.map((profile) => cp.execFileSync(path.join(app.getPath('userData'), 'vagrant-status.bat'), [profile.path]));
		const idx = statuses.findIndex((status) => status.includes(''));

		evt.returnValue = idx === -1 ? null : idx;
	});

	if (isProd) {
		await mainWindow.loadURL('app://./index.html');
	} else {
		const port = process.argv[2];

		await mainWindow.loadURL(`http://localhost:${port}`);
		mainWindow.webContents.openDevTools();
	}
})();

app.on('window-all-closed', () => {
	app.quit();
});
