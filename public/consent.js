(function () {
  const publisher = document.currentScript.dataset.publisher;
  let loading = false;
  document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-consent-revoke]');
    if (!button || loading) return;
    const status = document.querySelector('[data-consent-status]');
    loading = true;
    button.disabled = true;
    if (status) status.textContent = 'Laster samtykkevalg…';
    let timer;
    let script;
    let active = true;
    function finish(message) {
      if (!active) return;
      active = false;
      clearTimeout(timer);
      loading = false;
      button.disabled = false;
      if (status) status.textContent = message;
    }
    const failure = 'Samtykkevalget kunne ikke åpnes. Prøv igjen med nettforbindelse og uten innholdsblokkering, eller slett annonseinformasjonskapsler i nettleserens innstillinger.';
    timer = setTimeout(function () {
      if (script) script.remove();
      finish(failure);
    }, 15000);
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({
      CONSENT_DATA_READY: function () {
        if (!active) return;
        window.googlefc.showRevocationMessage();
        finish('Samtykkevalget er åpnet. Du kan endre eller trekke tilbake samtykket der.');
      }
    });
    if (!loading || document.querySelector('script[data-consent-manager]')) return;
    script = document.createElement('script');
    script.async = true;
    script.src = 'https://fundingchoicesmessages.google.com/i/' + publisher + '?ers=1';
    script.dataset.consentManager = '';
    script.onerror = function () {
      script.remove();
      finish(failure);
    };
    document.head.appendChild(script);
  });
})();
