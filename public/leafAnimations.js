(function(window){
    function createLeafAnimator(loadingElem, loadingLeaf, options={}){
        const tinyDuration = options.tinyLeafDuration || 1000;
        let stopCurrentAnim = null;

        // --- Animation 1: random jumps with trail (existing effect) ---
        let jumpInterval, leafX = 0, leafY = 0;
        const moveLeaf = () => {
            const maxX = window.innerWidth - 40;
            const maxY = window.innerHeight - 40;
            const newX = Math.random() * maxX;
            const newY = Math.random() * maxY;

            const trail = document.createElement('img');
            trail.src = loadingLeaf.src;
            trail.className = 'leaf-trail';
            trail.style.left = `${leafX}px`;
            trail.style.top = `${leafY}px`;
            loadingElem.appendChild(trail);
            setTimeout(() => trail.remove(), 1000);

            leafX = newX;
            leafY = newY;
            loadingLeaf.style.transform = `translate(${newX}px, ${newY}px) rotate(${Math.random()*360}deg)`;
        };
        const startJump = () => {
            loadingLeaf.style.transition = 'transform 0.8s linear';
            loadingLeaf.style.display = '';
            moveLeaf();
            jumpInterval = setInterval(moveLeaf, 800);
            return () => clearInterval(jumpInterval);
        };

        // --- Animation 2: bouncing leaf with gravity ---
        let bounceFrame;
        const startBounce = () => {
            loadingLeaf.style.transition = 'none';
            let x = Math.random() * (window.innerWidth - 40);
            let y = Math.random() * (window.innerHeight - 40);
            let vx = (Math.random() * 10 - 5);
            let vy = 15;
            let rot = 0;
            const g = 0.3;
            const step = () => {
                const maxX = window.innerWidth - 40;
                const maxY = window.innerHeight - 40;
                vy += g;
                x += vx;
                y += vy;
                if (x <= 0) { x = 0; vx *= -0.95; }
                if (x >= maxX) { x = maxX; vx *= -0.95; }
                if (y <= 0) { y = 0; vy *= -0.95; }
                if (y >= maxY) { y = maxY; vy *= -0.95; }
                rot += (vx + vy) * 2;
                loadingLeaf.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
                bounceFrame = requestAnimationFrame(step);
            };
            step();
            return () => cancelAnimationFrame(bounceFrame);
        };

        // --- Animation 3: spinning leaf that expels tiny leaves ---
        let spinFrame;
        const startSpin = () => {
            loadingLeaf.style.transition = 'none';
            const cx = window.innerWidth / 2 - 20;
            const cy = window.innerHeight / 2 - 20;
            let angle = 0;
            let speed = 0.1;
            const spawnTiny = () => {
                const leaf = document.createElement('img');
                leaf.src = loadingLeaf.src;
                leaf.className = 'tiny-leaf';
                leaf.style.left = `${cx + 20}px`;
                leaf.style.top = `${cy + 20}px`;
                const dist = 80 + Math.random() * 40;
                const a = Math.random() * Math.PI * 2;
                leaf.style.setProperty('--dx', `${Math.cos(a) * dist}px`);
                leaf.style.setProperty('--dy', `${Math.sin(a) * dist}px`);
                loadingElem.appendChild(leaf);
                setTimeout(() => leaf.remove(), tinyDuration);
            };
            const step = () => {
                speed += (Math.random() - 0.5) * 0.5;
                if (speed < 0.1) speed = 0.1;
                if (speed > 2) speed = 2;
                angle += speed * 10;
                loadingLeaf.style.transform = `translate(${cx}px, ${cy}px) rotate(${angle}deg)`;
                if (speed > 1.2) spawnTiny();
                spinFrame = requestAnimationFrame(step);
            };
            step();
            return () => cancelAnimationFrame(spinFrame);
        };

        const animations = [startJump, startBounce, startSpin];

        const startLeafAnimation = () => {
            const anim = animations[Math.floor(Math.random() * animations.length)];
            stopCurrentAnim = anim();
        };

        const stopLeafAnimation = () => {
            if (stopCurrentAnim) stopCurrentAnim();
            stopCurrentAnim = null;
        };

        return { startLeafAnimation, stopLeafAnimation };
    }

    window.createLeafAnimator = createLeafAnimator;
})(window);
