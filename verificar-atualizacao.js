// Só existe dentro do app mobile (Capacitor). No site normal
// window.Capacitor não existe, então isso vira no-op silencioso.
const ATUALIZACAO_DISPONIVEL = 2; // AppUpdateAvailability.UPDATE_AVAILABLE

async function verificarAtualizacaoDisponivel() {
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;
  const AppUpdate = window.Capacitor.Plugins && window.Capacitor.Plugins.AppUpdate;
  if (!AppUpdate) return;

  try {
    const info = await AppUpdate.getAppUpdateInfo();
    if (info.updateAvailability === ATUALIZACAO_DISPONIVEL) {
      document.getElementById("banner-atualizacao").hidden = false;
    }
  } catch (erro) {
    // Verificação de atualização é um extra: se falhar, o app segue normalmente.
  }
}

document.getElementById("btn-atualizar-app").addEventListener("click", () => {
  const AppUpdate = window.Capacitor.Plugins.AppUpdate;
  AppUpdate.openAppStore();
});

document.getElementById("btn-dispensar-atualizacao").addEventListener("click", () => {
  document.getElementById("banner-atualizacao").hidden = true;
});

verificarAtualizacaoDisponivel();
