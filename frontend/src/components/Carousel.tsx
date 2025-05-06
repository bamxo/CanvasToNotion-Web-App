import React, { useState, useEffect, useCallback } from 'react';
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
  }, [isAnimating]);

  const prevSlide = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setDirection('left');
    
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? teamMembers.length - 1 : prevIndex - 1
    );
  }, [isAnimating]);

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

  // When animation completes, update the visible cards
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setVisibleCards(getPositionedCards(currentIndex));
        setIsAnimating(false);
        setDirection(null);
      }, 600);
      
      return () => clearTimeout(timer);
    }
  }, [isAnimating, currentIndex]);

  return (
    <div className={styles.carouselContainer}>
      <div className={`
        ${styles.carouselTrack}
        ${isAnimating && direction === 'right' ? styles.animateRight : ''}
        ${isAnimating && direction === 'left' ? styles.animateLeft : ''}
      `}>
        {visibleCards.map(({ member, position }, index) => (
          <div
            key={`${member.name}-${index}-${position}`}
            className={`
              ${styles.card} 
              ${styles[`position${position}`] || styles.positionOutside}
            `}
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
        >
          <FaChevronLeft />
        </button>
        <button 
          className={`${styles.navButton} ${styles.nextButton}`} 
          onClick={() => handleNavClick('next')}
          disabled={isAnimating}
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
};

export default Carousel; 