// Notificações locais só existem dentro do app mobile (Capacitor). No
// site normal window.Capacitor não existe, então tudo aqui vira no-op.
const DIAS_LIMITE_NOTIFICACAO_LOCAL = 14;

function idNotificacaoParaSerie(serieId) {
  // LocalNotifications exige um id numérico; os ids de série vêm do
  // Firestore como string, então derivamos um número estável a partir dele.
  let hash = 0;
  for (let i = 0; i < serieId.length; i += 1) {
    hash = (hash * 31 + serieId.charCodeAt(i)) % 2147483647;
  }
  return hash;
}

async function reagendarNotificacoesLancamento(listaSeries) {
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;
  const LocalNotifications = window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  if (!LocalNotifications) return;

  try {
    const permissao = await LocalNotifications.checkPermissions();
    if (permissao.display !== "granted") {
      const pedido = await LocalNotifications.requestPermissions();
      if (pedido.display !== "granted") return;
    }

    const pendentes = await LocalNotifications.getPending();
    if (pendentes.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pendentes.notifications.map((n) => ({ id: n.id })) });
    }

    const notificacoesParaAgendar = listaSeries
      .filter((serie) => serie.proximaTemporadaData)
      .map((serie) => {
        const dias = diasAte(serie.proximaTemporadaData);
        if (dias === null || dias < 0 || dias > DIAS_LIMITE_NOTIFICACAO_LOCAL) return null;

        const [ano, mes, dia] = serie.proximaTemporadaData.split("-").map(Number);
        const dataNotificacao = new Date(ano, mes - 1, dia, 10, 0, 0);
        if (dataNotificacao.getTime() < Date.now()) return null;

        const ehNovaTemporada = serie.proximaTemporadaTipo === "confirmada";
        const titulo = ehNovaTemporada ? `Nova temporada de ${serie.nome}!` : `Novo episódio de ${serie.nome}!`;
        const corpo = ehNovaTemporada && serie.proximaTemporadaNumero
          ? `Temporada ${serie.proximaTemporadaNumero} já está disponível.`
          : "Já está disponível para assistir.";

        return {
          id: idNotificacaoParaSerie(serie.id),
          title: titulo,
          body: corpo,
          schedule: { at: dataNotificacao },
        };
      })
      .filter(Boolean);

    if (notificacoesParaAgendar.length > 0) {
      await LocalNotifications.schedule({ notifications: notificacoesParaAgendar });
    }
  } catch (erro) {
    // Notificação local é um extra: se falhar, o app continua funcionando normalmente.
  }
}
