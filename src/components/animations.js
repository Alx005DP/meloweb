import anime from "animejs"; //3.2.1


function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top <= window.innerHeight &&
    rect.bottom >= 0
  );
}

function animateOnScroll() {
  document.querySelectorAll('.scn h1').forEach((title) => {
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

  document.querySelectorAll('.scn p').forEach((paragraph, index) => {
    if (isInViewport(paragraph) && !paragraph.classList.contains('animated')) {
      paragraph.classList.add('animated');
      anime({
        targets: paragraph,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        easing: 'easeOutQuad',
        delay: index * 20
      });
    }
  });

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

  document.querySelectorAll('.block').forEach((block, index) => {
    if (isInViewport(block) && !block.classList.contains('animated')) {
      block.classList.add('animated');
      
      const isEven = index % 2 === 0;
      anime({
        targets: block,
        opacity: [0, 1],
        translateX: isEven ? [-50, 0] : [50, 0],
        duration: 900,
        easing: 'easeOutQuad',
        delay: (index % 2) * 100
      });
    }
  });

  document.querySelectorAll('button, .mrs, .acsbutton').forEach((btn, index) => {
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

    document.querySelectorAll('.mrb').forEach((btn2) => {
    if (isInViewport(btn2) && !btn2.classList.contains('animated')) {
      btn2.classList.add('animated');
      anime({
        targets: btn2,
        opacity: [0, 1],
        scale: [0.8, 2],
        duration: 600,
        easing: 'easeOutBack',
        delay: 200
      });
    }
  });

  document.querySelectorAll('.scn img').forEach((img, index) => {
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

window.addEventListener('scroll', animateOnScroll, { passive: true });

document.addEventListener("astro:page-load", () => {
  animateHeroOnLoad();
  animateOnScroll();
});