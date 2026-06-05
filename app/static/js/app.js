// JS común del sistema Los Churuguaros
document.addEventListener('DOMContentLoaded', () => {
  // Auto-cierre de flashes
  document.querySelectorAll('.flash').forEach(el => {
    setTimeout(() => el.style.transition = 'opacity .5s', 4000);
    setTimeout(() => el.style.opacity = '0', 4500);
    setTimeout(() => el.remove(), 5200);
  });
});
