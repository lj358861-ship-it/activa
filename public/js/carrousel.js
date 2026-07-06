// Carrousel réutilisable : charge les diapositives (image + slogan) d'une page
// et les fait défiler automatiquement. Fonctionne même sans image (fond dégradé + texte).
async function initCarrousel(pageCle, idConteneur) {
  const conteneur = document.getElementById(idConteneur);
  if (!conteneur) return;

  let diapositives = [];
  try {
    const reponse = await fetch(`/api/contenu-hero/${pageCle}`);
    const donnees = await reponse.json();
    diapositives = donnees.diapositives || [];
  } catch (e) {
    console.warn('Carrousel : impossible de charger le contenu.', e);
  }

  if (!diapositives.length) {
    conteneur.innerHTML = '';
    conteneur.classList.add('carrousel-vide');
    return;
  }

  conteneur.innerHTML = diapositives.map((d, i) => `
    <div class="carrousel-diapo ${i === 0 ? 'actif' : ''}" style="${d.image_path ? `background-image:url('/uploads/${d.image_path}')` : ''}">
      <div class="carrousel-voile"></div>
      <div class="carrousel-texte">
        <h1>${d.slogan}</h1>
        ${d.sous_texte ? `<p>${d.sous_texte}</p>` : ''}
      </div>
    </div>
  `).join('') + (diapositives.length > 1 ? `
    <div class="carrousel-puces">
      ${diapositives.map((_, i) => `<span class="puce ${i === 0 ? 'actif' : ''}" data-index="${i}"></span>`).join('')}
    </div>
  ` : '');

  if (diapositives.length <= 1) return;

  let index = 0;
  const diapos = conteneur.querySelectorAll('.carrousel-diapo');
  const puces = conteneur.querySelectorAll('.puce');

  function afficher(nouvelIndex) {
    diapos[index].classList.remove('actif');
    puces[index].classList.remove('actif');
    index = nouvelIndex;
    diapos[index].classList.add('actif');
    puces[index].classList.add('actif');
  }

  puces.forEach((puce) => {
    puce.addEventListener('click', () => afficher(parseInt(puce.dataset.index, 10)));
  });

  setInterval(() => afficher((index + 1) % diapos.length), 5500);
}
