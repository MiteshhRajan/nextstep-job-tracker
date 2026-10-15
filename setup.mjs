import { spawnSync } from 'node:child_process'
import { chdir } from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)))
chdir(projectDirectory)

const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 20 || nodeMajor > 24) {
  console.error(`Unsupported Node.js version: ${process.version}. Use Node.js 20, 22, or 24 LTS.`)
  process.exit(1)
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd: projectDirectory, stdio: 'inherit', shell: false })
  if (result.error) {
    console.error(`Could not run ${command}: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`Using Node.js ${process.version}`)
run(npmCommand, ['--version'])
console.log('Installing exact dependency versions from package-lock.json...')
run(npmCommand, ['ci'])
console.log('Checking the project...')
run(npmCommand, ['run', 'lint'])
run(npmCommand, ['test'])
run(npmCommand, ['run', 'build'])

console.log('\nSetup complete.')
console.log('Start the local app with: npm run dev')
console.log('Then open: http://localhost:5173')
