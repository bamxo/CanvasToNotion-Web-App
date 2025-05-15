import React, { useState, useEffect, useCallback, useRef, TouchEvent, KeyboardEvent } from 'react';
import styles from './Carousel.module.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Team Member 1",
    role: "Role 1",
    bio: "Short bio describing the first team member's contributions and interests.",
    image: "/placeholder1.jpg"
  },
  {
    name: "Team Member 2",
    role: "Role 2",
    bio: "Short bio describing the second team member's contributions and interests.",
    image: "/placeholder2.jpg"
  },
  {
    name: "Team Member 3",
    role: "Role 3",
    bio: "Short bio describing the third team member's contributions and interests.",
    image: "/placeholder3.jpg"
  },
  {
    name: "Team Member 4",
    role: "Role 4",
    bio: "Short bio describing the fourth team member's contributions and interests.",
    image: "/placeholder4.jpg"
  },
  {
    name: "Team Member 5",
    role: "Role 5",
    bio: "Short bio describing the fifth team member's contributions and interests.",
    image: "/placeholder5.jpg"
  }
];

const Carousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [visibleCards, setVisibleCards] = useState(() => getPositionedCards(currentIndex));
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  
  // Touch handling state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);
  const velocityX = useRef<number>(0);
  const [isSwipingState, setIsSwipingState] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const minSwipeDistance = 50;
  const minSwipeVelocity = 0.2; // pixels per millisecond
  
  // Animation management
  const animationRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transitionEndRef = useRef<(() => void) | null>(null);

  function getPositionedCards(centerIndex: number) {
    const cards = [];
    for (let i = -3; i <= 3; i++) {
      let index = centerIndex + i;
      if (index < 0) index = teamMembers.length + index;
      if (index >= teamMembers.length) index = index - teamMembers.length;
      cards.push({ member: teamMembers[index], position: i });
    }
    return cards;
  }

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setDirection('right');
    
    setCurrentIndex((prevIndex) => 
      prevIndex === teamMembers.length - 1 ? 0 : prevIndex + 1
    );
    
    // Set up the animation end handler
    setupTransitionEnd();
  }, [isAnimating]);

  const prevSlide = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setDirection('left');
    
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? teamMembers.length - 1 : prevIndex - 1
    );
    
    // Set up the animation end handler
    setupTransitionEnd();
  }, [isAnimating]);

  // Setup the transition end timer and handler
  const setupTransitionEnd = () => {
    // Clear any existing animation frame or timeout
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    
    // Create a new transition end handler
    const handleTransitionEnd = () => {
      setVisibleCards(getPositionedCards(currentIndex));
      setIsAnimating(false);
      setDirection(null);
      
      // Clear the refs
      animationRef.current = null;
      transitionEndRef.current = null;
    };
    
    transitionEndRef.current = handleTransitionEnd;
    
    // Start the animation timer - slightly shorter than CSS transition time
    // to ensure we're ready for the next swipe before the visual transition fully completes
    animationTimeoutRef.current = setTimeout(() => {
      if (transitionEndRef.current) {
        transitionEndRef.current();
      }
    }, 500); // CSS transition is 600ms, we complete state change earlier
  };

  // Clean up animation timers on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // Handle auto-scrolling
  useEffect(() => {
    let autoScrollTimer: NodeJS.Timeout;

    const startAutoScroll = () => {
      autoScrollTimer = setInterval(() => {
        if (!autoScrollPaused) {
          nextSlide();
        }
      }, 5000); // Auto scroll every 5 seconds
    };

    startAutoScroll();

    // Cleanup function
    return () => {
      clearInterval(autoScrollTimer);
    };
  }, [nextSlide, autoScrollPaused]);

  // Touch event handlers for swipe functionality
  const handleTouchStart = (e: TouchEvent) => {
    // Only block if in the middle of an animation transition
    if (isAnimating && !transitionEndRef.current) return;
    
    // If we're at the end of a transition but the animation state hasn't updated yet,
    // force complete the transition now
    if (isAnimating && transitionEndRef.current) {
      transitionEndRef.current();
    }
    
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = touchStartX.current;
    touchDeltaX.current = 0;
    touchStartTime.current = Date.now();
    velocityX.current = 0;
    isSwiping.current = true;
    setIsSwipingState(true);
    setDragOffset(0);
    setAutoScrollPaused(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartX.current || !isSwiping.current) return;
    
    // Calculate the new position and velocity
    const currentTime = Date.now();
    const previousX = touchEndX.current || touchStartX.current;
    const currentX = e.touches[0].clientX;
    const timeDelta = currentTime - touchStartTime.current;
    
    if (timeDelta > 0) {
      // Calculate instantaneous velocity (pixels per ms)
      velocityX.current = (currentX - previousX) / timeDelta;
    }
    
    // Update the touch position
    touchEndX.current = currentX;
    touchDeltaX.current = touchEndX.current - touchStartX.current;
    setDragOffset(touchDeltaX.current);
    
    // Update the touch start time for next velocity calculation
    touchStartTime.current = currentTime;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || !isSwiping.current) {
      resetTouchState();
      return;
    }

    const distance = touchStartX.current - touchEndX.current;
    const absVelocity = Math.abs(velocityX.current);
    
    // Apply different thresholds based on velocity and distance
    const isLeftSwipe = distance > minSwipeDistance || (distance > minSwipeDistance / 2 && velocityX.current < -minSwipeVelocity);
    const isRightSwipe = distance < -minSwipeDistance || (distance < -minSwipeDistance / 2 && velocityX.current > minSwipeVelocity);
    
    // Determine direction based on distance and velocity
    let swipeResult: 'left' | 'right' | null = null;
    
    // Check high velocity swipes even with small distance
    if (absVelocity > minSwipeVelocity * 2) {
      swipeResult = velocityX.current > 0 ? 'right' : 'left';
    } 
    // Otherwise use the distance-based approach
    else if (isLeftSwipe) {
      swipeResult = 'left';
    } else if (isRightSwipe) {
      swipeResult = 'right';
    }
    
    // Apply bounce-back animation if not enough momentum to trigger a slide
    if (!swipeResult) {
      // If we're not changing slides, animate the drag offset back to 0
      // This is handled by CSS transition added to .card:not(.dragging)
      setDragOffset(0);
      setTimeout(() => resetTouchState(), 300); // Match transition time in CSS
    } else {
      // Set direction for animated transition
      if (swipeResult === 'left') {
        nextSlide();
      } else {
        prevSlide();
      }
      
      // Reset touch state
      resetTouchState();
    }

    // Resume auto-scrolling after 8 seconds
    setTimeout(() => {
      setAutoScrollPaused(false);
    }, 8000);
  };

  // Helper to reset touch state
  const resetTouchState = () => {
    touchStartX.current = null;
    touchEndX.current = null;
    touchDeltaX.current = 0;
    isSwiping.current = false;
    setIsSwipingState(false);
    setDragOffset(0);
  };

  // Cancel swipe on touch cancel
  const handleTouchCancel = () => {
    resetTouchState();
    
    // Resume auto-scrolling after a delay
    setTimeout(() => {
      setAutoScrollPaused(false);
    }, 8000);
  };

  // Handle navigation click pause
  const handleNavClick = (direction: 'prev' | 'next') => {
    setAutoScrollPaused(true);
    
    if (direction === 'prev') {
      prevSlide();
    } else {
      nextSlide();
    }

    // Resume auto-scrolling after 8 seconds
    setTimeout(() => {
      setAutoScrollPaused(false);
    }, 8000);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          prevSlide();
          setAutoScrollPaused(true);
          // Resume auto-scrolling after 8 seconds
          setTimeout(() => setAutoScrollPaused(false), 8000);
          break;
        case 'ArrowRight':
          nextSlide();
          setAutoScrollPaused(true);
          // Resume auto-scrolling after 8 seconds
          setTimeout(() => setAutoScrollPaused(false), 8000);
          break;
        default:
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown as any);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [isAnimating, nextSlide, prevSlide]);

  const getCardStyle = (position: number) => {
    if (!isSwipingState || dragOffset === 0) {
      return undefined; // Use default styling when not swiping
    }
    
    // Calculate how much cards should move based on their position and drag amount
    let dragFactor;
    
    if (position === 0) {
      // Center card follows finger more closely
      dragFactor = 0.8; // 80% of finger movement (feels more responsive)
    } else if (position === 1 || position === -1) {
      // Adjacent cards move in the same direction but less
      dragFactor = 0.25;
    } else if (position === 2 || position === -2) {
      // Outer cards move even less
      dragFactor = 0.1;
    } else {
      // Other cards don't move with drag
      return undefined;
    }
    
    // Calculate the drag amount based on position and factor
    const dragAmount = dragOffset * dragFactor;
    
    // Adjust base scale and rotation based on position
    const baseScale = position === 0 ? 1 : position === 1 || position === -1 ? 0.8 : 0.6;
    const baseRotateY = position === 0 ? 0 : position === 1 ? -5 : position === -1 ? 5 : 
                        position === 2 ? -10 : position === -2 ? 10 : 0;
    
    // Apply small scale increase when dragging the center card
    const scaleBoost = position === 0 ? 0.02 : 0;
    
    // For center card, apply slight rotation based on drag direction
    let rotationAdjustment = 0;
    if (position === 0 && dragOffset !== 0) {
      // Apply slight rotation based on drag direction (max ±3 degrees)
      rotationAdjustment = Math.min(Math.max(dragOffset * 0.01, -3), 3);
    }
    
    // Base translation based on position
    let baseTranslateX = position * 100;
    
    // Build the transform string
    return {
      transform: `
        translateX(calc(${baseTranslateX}% + ${dragAmount}px)) 
        scale(${baseScale + scaleBoost}) 
        rotateY(${baseRotateY + rotationAdjustment}deg)
        translateZ(0)
      `,
      boxShadow: position === 0 ? `0 ${10 + Math.abs(dragOffset) * 0.05}px ${30 + Math.abs(dragOffset) * 0.1}px rgba(0, 0, 0, ${0.3 + Math.abs(dragOffset) * 0.0005})` : undefined
    };
  };

  return (
    <div 
      className={styles.carouselContainer}
      role="region"
      aria-label="Team members carousel"
      tabIndex={0}
    >
      <div 
        className={`
          ${styles.carouselTrack}
          ${isAnimating && direction === 'right' ? styles.animateRight : ''}
          ${isAnimating && direction === 'left' ? styles.animateLeft : ''}
          ${isSwipingState ? styles.swiping : ''}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        aria-live="polite"
      >
        {visibleCards.map(({ member, position }, index) => (
          <div
            key={`${member.name}-${index}-${position}`}
            className={`
              ${styles.card} 
              ${styles[`position${position}`] || styles.positionOutside}
              ${position === 0 && isSwipingState ? styles.dragging : ''}
            `}
            style={getCardStyle(position)}
            aria-hidden={position !== 0} // Only the center card is not hidden from screen readers
            role={position === 0 ? "group" : undefined}
            aria-roledescription={position === 0 ? "slide" : undefined}
            aria-label={position === 0 ? `${member.name}, ${member.role}` : undefined}
          >
            <div className={styles.cardContent}>
              <div className={styles.imageContainer}>
                <img src={member.image} alt={member.name} className={styles.memberImage} />
              </div>
              <h3 className={styles.memberName}>{member.name}</h3>
              <h4 className={styles.memberRole}>{member.role}</h4>
              <p className={styles.memberBio}>{member.bio}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <button 
          className={`${styles.navButton} ${styles.prevButton}`} 
          onClick={() => handleNavClick('prev')}
          disabled={isAnimating}
          aria-label="Previous slide"
        >
          <FaChevronLeft />
        </button>
        <button 
          className={`${styles.navButton} ${styles.nextButton}`} 
          onClick={() => handleNavClick('next')}
          disabled={isAnimating}
          aria-label="Next slide"
        >
          <FaChevronRight />
        </button>
      </div>
      
      {/* Screen reader info */}
      <div className="sr-only" aria-live="polite">
        Showing slide {currentIndex + 1} of {teamMembers.length}
      </div>
    </div>
  );
};

export default Carousel; 