// Importar anime (asumiendo que ya está en tu HTML)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>

// Función para detectar si un elemento está en viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top <= window.innerHeight &&
    rect.bottom >= 0
  );
}

// Función para animar elementos cuando entran en viewport
function animateOnScroll() {
  // Animar títulos (h1)
  document.querySelectorAll('section h1').forEach((title) => {
    if (isInViewport(title) && !title.classList.contains('animated')) {
      title.classList.add('animated');
      anime({
        targets: title,
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
        easing: 'easeOutQuad',
        delay: 0
      });
    }
  });

  // Animar párrafos
  document.querySelectorAll('section p').forEach((paragraph, index) => {
    if (isInViewport(paragraph) && !paragraph.classList.contains('animated')) {
      paragraph.classList.add('animated');
      anime({
        targets: paragraph,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        easing: 'easeOutQuad',
        delay: index * 100
      });
    }
  });

  // Animar cards
  document.querySelectorAll('#card').forEach((card, index) => {
    if (isInViewport(card) && !card.classList.contains('animated')) {
      card.classList.add('animated');
      anime({
        targets: card,
        opacity: [0, 1],
        scale: [0.9, 1],
        translateY: [30, 0],
        duration: 800,
        easing: 'easeOutQuad',
        delay: index * 150
      });
    }
  });

  // Animar bloques de "Por qué elegirnos"
  document.querySelectorAll('.block').forEach((block, index) => {
    if (isInViewport(block) && !block.classList.contains('animated')) {
      block.classList.add('animated');
      
      // Alternar dirección de entrada
      const isEven = index % 2 === 0;
      anime({
        targets: block,
        opacity: [0, 1],
        translateX: isEven ? [-50, 0] : [50, 0],
        duration: 900,
        easing: 'easeOutQuad',
        delay: (index % 2) * 200
      });
    }
  });

  // Animar botones
  document.querySelectorAll('button, .acpbutton, .acsbutton').forEach((btn, index) => {
    if (isInViewport(btn) && !btn.classList.contains('animated')) {
      btn.classList.add('animated');
      anime({
        targets: btn,
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 600,
        easing: 'easeOutBack',
        delay: index * 100
      });
    }
  });

  // Animar imágenes
  document.querySelectorAll('img').forEach((img, index) => {
    if (isInViewport(img) && !img.classList.contains('animated')) {
      img.classList.add('animated');
      anime({
        targets: img,
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 800,
        easing: 'easeOutQuad',
        delay: index * 100
      });
    }
  });

  // Animar iframe (mapa)
  document.querySelectorAll('iframe').forEach((iframe) => {
    if (isInViewport(iframe) && !iframe.classList.contains('animated')) {
      iframe.classList.add('animated');
      anime({
        targets: iframe,
        opacity: [0, 1],
        translateY: [40, 0],
        duration: 900,
        easing: 'easeOutQuad'
      });
    }
  });
}

// Animar elementos del hero al cargar
function animateHeroOnLoad() {
  const heroSection = document.querySelector('#hero');
  const heroTitle = heroSection?.querySelector('h1');
  const heroParagraph = heroSection?.querySelector('p');
  const heroButtons = heroSection?.querySelectorAll('.buttons a');

  if (heroTitle) {
    anime({
      targets: heroTitle,
      opacity: [0, 1],
      translateY: [50, 0],
      duration: 1000,
      easing: 'easeOutQuad',
      delay: 300
    });
  }

  if (heroParagraph) {
    anime({
      targets: heroParagraph,
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 1000,
      easing: 'easeOutQuad',
      delay: 500
    });
  }

  if (heroButtons) {
    anime({
      targets: heroButtons,
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 800,
      easing: 'easeOutBack',
      delay: anime.stagger(150, { start: 700 })
    });
  }
}

// Event listeners
// document.addEventListener("astro:page-load", () => {
//   window.addEventListener('scroll', animateOnScroll, { passive: true });
//   animateHeroOnLoad();
//   animateOnScroll();
// });
// Ejecutar una vez al cargar por si el usuario está abajo
setTimeout(animateOnScroll, 100);