import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import '../styles/LivesSavedCounter.css';

// Background images with strategic positioning for visual narrative
const backgroundImages = [
    { src: '/assets/images/tireddriver.jpg', zone: 'top-left', mobileVisible: true },
    { src: '/assets/images/drivertired.jpg', zone: 'top-right', mobileVisible: true },
    { src: '/assets/images/steeringwheel.jpg', zone: 'middle-left', mobileVisible: true },
    { src: '/assets/images/steeringwheel2.jpg', zone: 'middle-right', mobileVisible: false },
    { src: '/assets/images/interior.jpg', zone: 'lower-left', mobileVisible: true },
    { src: '/assets/images/interior2.jpg', zone: 'lower-right', mobileVisible: false },
    { src: '/assets/images/highway.jpg', zone: 'bottom-left', mobileVisible: false },
    { src: '/assets/images/highway2.jpg', zone: 'bottom-center', mobileVisible: true },
    { src: '/assets/images/highway4.jpg', zone: 'bottom-right', mobileVisible: true },
];

const zonePositions = {
    'top-left': { x: [5, 18], y: [5, 18], parallax: 15 },
    'top-right': { x: [78, 92], y: [5, 18], parallax: -15 },
    'middle-left': { x: [3, 16], y: [28, 42], parallax: 12 },
    'middle-right': { x: [80, 94], y: [28, 42], parallax: -12 },
    'lower-left': { x: [5, 20], y: [55, 68], parallax: 10 },
    'lower-right': { x: [76, 92], y: [55, 68], parallax: -10 },
    'bottom-left': { x: [8, 22], y: [75, 88], parallax: 8 },
    'bottom-center': { x: [38, 58], y: [82, 94], parallax: 0 },
    'bottom-right': { x: [74, 90], y: [75, 88], parallax: -8 },
};

const LivesSavedCounter = () => {
    const [count, setCount] = useState(0);
    const [phase, setPhase] = useState('waiting');
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [glowIntensity, setGlowIntensity] = useState(0.4);
    const [isPulsing, setIsPulsing] = useState(false);
    // New state for staggered final reveal
    const [showLine, setShowLine] = useState(false);
    const [showTagline, setShowTagline] = useState(false);
    const [showStatement, setShowStatement] = useState(false);
    const sectionRef = useRef(null);
    const animationRef = useRef(null);
    const hasTriggeredRef = useRef(false);

    const imagePositions = useMemo(() => {
        return backgroundImages.map((img, index) => {
            const zone = zonePositions[img.zone];
            const x = zone.x[0] + Math.random() * (zone.x[1] - zone.x[0]);
            const y = zone.y[0] + Math.random() * (zone.y[1] - zone.y[0]);
            const rotation = -2 + Math.random() * 4;
            return {
                ...img,
                id: index,
                x,
                y,
                rotation,
                parallax: zone.parallax,
                delay: index * 0.35,
            };
        });
    }, []);

    useEffect(() => {
        let mounted = true;
        let timeoutId;

        const preloadImages = () => {
            const promises = backgroundImages.map(({ src }) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                    img.src = src;
                });
            });

            Promise.race([
                Promise.all(promises),
                new Promise((resolve) => {
                    timeoutId = setTimeout(() => resolve('timeout'), 2000);
                }),
            ]).then(() => {
                if (mounted) setImagesLoaded(true);
            });
        };

        preloadImages();
        return () => {
            mounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    const prefersReducedMotion = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    const formatNumber = (num) => num.toLocaleString('en-IN');
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animateCount = useCallback((start, end, duration, onComplete) => {
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);
            const currentCount = Math.floor(start + (end - start) * easedProgress);

            setCount(currentCount);
            setGlowIntensity(0.4 + (currentCount / 150000) * 0.6);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                setCount(end);
                if (onComplete) onComplete();
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, []);

    const triggerPulse = useCallback(() => {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 300);
    }, []);

    // Main animation - cinematic VIGILX reveal
    const startAnimation = useCallback(() => {
        if (hasTriggeredRef.current) return;
        hasTriggeredRef.current = true;

        if (prefersReducedMotion) {
            setPhase('final');
            setCount(0);
            setShowLine(true);
            setShowTagline(true);
            setShowStatement(true);
            return;
        }

        setPhase('counting');

        setTimeout(() => {
            animateCount(0, 10000, 700, () => {
                triggerPulse();
                setPhase('paused');
                setTimeout(() => {
                    setPhase('counting');
                    animateCount(10000, 50000, 650, () => {
                        triggerPulse();
                        setPhase('paused');
                        setTimeout(() => {
                            setPhase('counting');
                            animateCount(50000, 100000, 650, () => {
                                triggerPulse();
                                setPhase('paused');
                                setTimeout(() => {
                                    setPhase('counting');
                                    animateCount(100000, 150000, 700, () => {
                                        triggerPulse();
                                        setPhase('paused-final');
                                        // 0.8s dramatic pause at 150,000
                                        setTimeout(() => {
                                            setPhase('fading');
                                            // 0.5s fade to black
                                            setTimeout(() => {
                                                setPhase('final');
                                                setCount(0);
                                                // Staggered reveal sequence
                                                // 0.8s after final: line draws
                                                setTimeout(() => setShowLine(true), 800);
                                                // 1.4s after final: tagline appears
                                                setTimeout(() => setShowTagline(true), 1400);
                                                // 2.4s after final: statement appears
                                                setTimeout(() => setShowStatement(true), 2400);
                                            }, 500);
                                        }, 800);
                                    });
                                }, 200);
                            });
                        }, 150);
                    });
                }, 150);
            });
        }, 300);
    }, [animateCount, triggerPulse, prefersReducedMotion]);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !hasTriggeredRef.current) {
                        startAnimation();
                    }
                });
            },
            { threshold: 0.5 }
        );

        const currentRef = sectionRef.current;
        if (currentRef) observer.observe(currentRef);

        return () => {
            observer.disconnect();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [startAnimation]);

    const isCountingPhase = phase === 'counting' || phase === 'paused' || phase === 'paused-final';
    const isFinalPhase = phase === 'final';
    const isFading = phase === 'fading';

    const glowStyle = {
        textShadow: `0 0 ${20 + glowIntensity * 30}px rgba(255, 68, 68, ${glowIntensity})`,
    };

    return (
        <section
            ref={sectionRef}
            className={`lives-saved-counter-section ${phase}`}
            aria-label="Impact statistics"
        >
            <p className="sr-only">
                150,000 lives lost to driver fatigue annually. VIGILX: Always watching. Always protecting. Drowsiness detected in 0.2 seconds. Lives saved forever.
            </p>

            {/* Background Images */}
            {imagesLoaded && (
                <div className="background-images-container" aria-hidden="true">
                    {imagePositions.map(({ src, id, x, y, rotation, parallax, delay, mobileVisible }) => (
                        <div
                            key={id}
                            className={`background-image ${isCountingPhase ? 'visible' : ''} ${!mobileVisible ? 'desktop-only' : ''}`}
                            style={{
                                left: `${x}%`,
                                top: `${y}%`,
                                '--rotation': `${rotation}deg`,
                                '--parallax': `${parallax}px`,
                                '--delay': `${delay}s`,
                            }}
                        >
                            <img src={src} alt="" />
                        </div>
                    ))}
                    <div className="vignette-overlay"></div>
                    {isCountingPhase && (
                        <div className="red-vignette" style={{ opacity: glowIntensity * 0.35 }}></div>
                    )}
                </div>
            )}

            {/* Counter Content */}
            <div className="counter-content" aria-hidden="true">
                {!isFinalPhase && !isFading && (
                    <>
                        <p className="counter-label-top">
                            {phase === 'waiting' ? '' : 'lives lost to driver fatigue annually'}
                        </p>
                        <div
                            className={`counter-display ${phase === 'paused-final' ? 'final-red' : ''} ${isPulsing ? 'pulsing' : ''}`}
                            style={glowStyle}
                        >
                            {formatNumber(count)}
                        </div>
                    </>
                )}

                {isFading && <div className="fading-overlay"></div>}

                {/* CINEMATIC VIGILX HERO INTRODUCTION */}
                {isFinalPhase && (
                    <div className="vigilx-reveal">
                        {/* Massive VIGILX name */}
                        <h2 className="vigilx-hero-name">VIGILX</h2>

                        {/* Animated green line beneath */}
                        <div className={`vigilx-line ${showLine ? 'visible' : ''}`}></div>

                        {/* Always watching tagline */}
                        {showTagline && (
                            <p className="vigilx-tagline">Always watching. Always protecting.</p>
                        )}

                        {/* Final statement with speed highlight */}
                        {showStatement && (
                            <p className="vigilx-statement">
                                Drowsiness detected in <span className="speed-highlight">0.2 seconds</span>. Lives saved forever.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {phase === 'paused-final' && <div className="red-pulse-blast" aria-hidden="true"></div>}
        </section>
    );
};

export default LivesSavedCounter;
