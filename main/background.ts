import cp from 'child_process';
import { app, ipcMain } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';

const isProd: boolean = process.env.NODE_ENV === 'production';

if (isProd) {
	serve({ directory: 'app' });
} else {
	app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
	await app.whenReady();

	const mainWindow = createWindow('main', {
		width: 1000,
		height: 600
	});

	if (isProd) {
		await mainWindow.loadURL('app://./index.html');
	} else {
		const port = process.argv[2];
		await mainWindow.loadURL(`http://localhost:${port}/`);
		mainWindow.webContents.openDevTools();

		ipcMain.on('launch', (evt, path: string) => {
			cp.spawn('vagrant up', { cwd: path })
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
				});
		});

		ipcMain.on('close', (evt, path: string) => {
			evt.returnValue = new Promise<void>((resolve, reject) => {
				cp.spawn('vagrant halt', { cwd: path })
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
		});
	}
})();

app.on('window-all-closed', () => {
	app.quit();
});
