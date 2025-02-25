import { fetchPlaceholders } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const CAROUSEL_TIMER = 5000;

export function startInterval(block) {
  const interval = parseInt(block.dataset.interval, 10);
  block.loadPercentage = 0;
  if (interval > 0) {
    block.dataset.intervalIdPercentage = setInterval(() => {
      if (block.dataset.state === 'paused') return;
      const slides = block.querySelectorAll('.carousel-slide');
      const slideIndex = parseInt(block.dataset.activeSlide, 10);
      const indicator = block.querySelector(
        `.carousel-slide-indicator[data-target-slide="${slideIndex}"] > button`
      );
      if (!indicator) return;
      
      const percentage = (1 + block.loadPercentage) % 100;
      block.loadPercentage = percentage;
      indicator.style.width = `${percentage}%`;
      
      block.querySelectorAll('.carousel-slide-indicator > button').forEach((ind) => {
        if (ind !== indicator) ind.style.width = '0';
      });
      
      if (percentage === 0) {
        block.dataset.activeSlide = (parseInt(block.dataset.activeSlide, 10) + 1) % slides.length;
        showSlide(block, block.dataset.activeSlide);
        indicator.style.width = '0';
      }
    }, interval / 100);
  }
}

export function stopInterval(block) {
  if (block.dataset.intervalIdPercentage) {
    clearInterval(Number(block.dataset.intervalIdPercentage));
    delete block.loadPercentage;
    block.removeAttribute('data-interval-id-percentage');
  }
}

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;
  
  const slides = block.querySelectorAll('.carousel-slide');
  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (button) {
      button.disabled = idx === slideIndex;
    }
  });
}

export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  block.dataset.activeSlide = realSlideIndex;

  const activeSlide = slides[realSlideIndex];
  block.querySelectorAll('.carousel-slide-indicator > button').forEach((ind, index) => {
    if (index !== realSlideIndex) ind.style.width = '0';
  });

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
  
  setTimeout(() => {
    block.loadPercentage = 0;
  }, 100);
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('li').forEach((button) => {
    button.addEventListener('click', (e) => {
      showSlide(block, parseInt(e.currentTarget.dataset.targetSlide, 10));
    });
  });

  const prevButton = block.querySelector('.slide-prev');
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
    });
  }

  const nextButton = block.querySelector('.slide-next');
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
    });
  }

  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) updateActiveSlide(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });

  block.addEventListener('mouseenter', () => {
    block.dataset.state = 'paused';
  });
  block.addEventListener('mouseleave', () => {
    block.dataset.state = 'playing';
  });
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  rows.forEach((row, idx) => {
    const slide = document.createElement('li');
    slide.dataset.slideIndex = idx;
    slide.classList.add('carousel-slide');
    slide.append(...row.children);
    slidesWrapper.append(slide);
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
    block.dataset.interval = `${CAROUSEL_TIMER}`;
    startInterval(block);
  }
}
