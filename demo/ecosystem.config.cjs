module.exports = {
  apps: [
    {
      name: 'egregore-demo',
      script: 'server.js',
      cwd: '/home/user/egregore/demo',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false
    }
  ]
};