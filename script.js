function scrollToSection(sectionId) {
    var section = document.getElementById(sectionId);
    section.scrollIntoView({ behavior: 'smooth' });
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        console.log(entry);
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
            else{
            entry.target.classList.remove('show');
    }
    });
});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) => observer.observe(el));

document.addEventListener('mousemove', (e) => {
    const MouseX=e.clientX;
    const MouseY=e.clientY;
    const anchor = document.getElementById('anchor')
    const rekt=anchor.getBoundingClientRect();
    const anchorX = rekt.left + rekt.width /2;
    const anchorY = rekt.top + rekt.height /2;
    const angleDeg= angle(MouseX,MouseY,anchorX,anchorY);
    console.log(angleDeg);

    const eyes = document.querySelectorAll('.eye')
    eyes.forEach(eye => {
        eye.style.transform = `rotate(${90 + angleDeg}deg)`;
    })
    
})

function angle(cx,cy,ex,ey){
    const dy=ey-cy;
    const dx=ex-cx;
    const rad=Math.atan2(dy,dx);
    const deg = rad * 180 / Math.PI;
    return deg;
}

const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;
const named = document.querySelector('.named');
const download = document.querySelector('.download-button');
const blog = document.querySelector('.blog');

darkModeToggle.addEventListener('change', () => {
    const buttons = document.querySelectorAll('.button');
    const faIcons = document.querySelectorAll('.fa');

    if (darkModeToggle.checked) {
        body.classList.add('dark-mode');
        buttons.forEach(button => button.classList.add('dark-mode'));
        faIcons.forEach(icon => icon.classList.add('dark-mode'));
        named.classList.add('dark-mode');
        download.classList.add('dark-mode');
        blog.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
        buttons.forEach(button => button.classList.remove('dark-mode'));
        faIcons.forEach(icon => icon.classList.remove('dark-mode'));
        named.classList.remove('dark-mode');
        download.classList.remove('dark-mode');
        blog.classList.remove('dark-mode');
    }
});

function downloadCV() {
    window.location.href = 'cv-file.pdf';
}


