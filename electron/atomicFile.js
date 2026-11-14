import fs from 'node:fs/promises'
import path from 'node:path'

// Some Windows profiles (for example EFS-encrypted AppData folders) reject
// rename within the same directory with EXDEV even though the volume is shared.
// Fall back to copy-and-remove so startup state and backups are still written.
export async function replaceFile(tempPath, targetPath) {
  try {
    await fs.rename(tempPath, targetPath)
    return
  } catch (error) {
    if (error?.code !== 'EXDEV') throw error
  }
  await fs.copyFile(tempPath, targetPath)
  await fs.rm(tempPath, { force: true })
}

export async function writeFileAtomic(filePath, content, encoding = 'utf-8') {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`
  try {
    await fs.writeFile(tempPath, content, encoding)
    await replaceFile(tempPath, filePath)
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {})
  }
}
