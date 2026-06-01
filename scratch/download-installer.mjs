import fs from 'fs';

async function downloadInstaller() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1');
    const text = await res.text();
    fs.writeFileSync('C:\\Users\\ivan.sanchez\\Documents\\Proyectos DEV\\Remolques-TGM\\scratch\\caveman-install.ps1', text);
    console.log('Downloaded caveman install.ps1');
  } catch (err) {
    console.error('Failed to download:', err);
  }
}

downloadInstaller();
