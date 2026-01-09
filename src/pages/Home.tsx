import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import About from '../components/About';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { ArrowRight, ChevronDown } from 'lucide-react';
import dashboard_image from '../assests/dashboard_image.png';
import main_page from '../assests/main.png';
import screen from '../assests/cake.png';

const Home = () => {
  const navigate = useNavigate();
  const featuresRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for animations
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const handleIntersect = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    return () => {
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section id="hero" className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 px-4 sm:px-6 md:px-10 overflow-hidden">
        {/* Background animated elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full opacity-10 animate-blob"></div>
          <div className="absolute top-60 -right-20 w-60 h-60 bg-yellow-400 rounded-full opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-60 w-40 h-40 bg-yellow-300 rounded-full opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center space-y-8 mb-16 animate-fade-in">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white leading-tight animate-slide-up">
              Welcome to <span className="text-yellow-400 animate-pulse-subtle">SiteCrafter</span>
              <br />
              <span className="animate-slide-up animation-delay-300">Bring your Vision to Life</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto animate-slide-up animation-delay-600">
              Create stunning websites that turn visitors into customers with our AI-powered platform
            </p>
            <div className="animate-slide-up animation-delay-900">
              <button
                onClick={() => navigate('/agent')}
                className="inline-flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 animate-fade-in animation-delay-1200">
            {[
              { img: dashboard_image, delay: 0 },
              { img: main_page, delay: 300 },
              { img: screen, delay: 600 }
            ].map((item, index) => (
              <div
                key={index}
                className={`transform transition-all duration-500 hover:scale-105 hover:rotate-1 animate-slide-up ${index === 1 ? 'md:translate-y-8' : ''
                  } animation-delay-${item.delay}`}
              >
                <img
                  src={item.img}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-48 sm:h-64 object-cover rounded-xl shadow-xl hover:shadow-2xl"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-16 animate-bounce-slow">
            <button
              onClick={scrollToFeatures}
              className="text-white hover:text-yellow-400 transition-colors duration-300 focus:outline-none"
              aria-label="Scroll to features"
            >
              <ChevronDown className="w-8 h-8" />
            </button>
          </div>
        </div>
      </section>

      <div ref={featuresRef}>
        <section className="py-16 px-4 sm:px-6 md:px-10 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 animate-on-scroll opacity-0 transition-all duration-700 transform translate-y-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose SiteCrafter?</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">Our platform combines cutting-edge AI with intuitive design tools to help you create websites that convert.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "AI-Powered Design",
                  description: "Our AI analyzes top-performing websites to suggest designs that convert visitors into customers.",
                  delay: 0
                },
                {
                  title: "Easy Customization",
                  description: "No coding required. Our drag-and-drop editor makes customization simple for everyone.",
                  delay: 200
                },
                {
                  title: "SEO Optimization",
                  description: "Built-in SEO tools ensure your website ranks high in search results.",
                  delay: 400
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className={`bg-gray-50 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-on-scroll opacity-0 transition-all duration-700 translate-y-10`}
                  style={{ transitionDelay: `${feature.delay}ms` }}
                >
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-yellow-600 text-xl font-bold">{index + 1}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <About />
      <Contact />
      <Footer />

      {/* Add CSS for animations */}
      <style>
        {`
        @keyframes blob {
          0% { transform: scale(1) translate(0px, 0px); }
          33% { transform: scale(1.1) translate(30px, -50px); }
          66% { transform: scale(0.9) translate(-20px, 20px); }
          100% { transform: scale(1) translate(0px, 0px); }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(10px); }
        }
        
        .animate-blob {
          animation: blob 7s infinite alternate;
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 3s infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        
        .animate-fade-in {
          opacity: 0;
          animation: fadeIn 1s forwards;
        }
        
        .animate-slide-up {
          opacity: 0;
          transform: translateY(20px);
          animation: slideUp 0.8s forwards;
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        
        .animation-delay-600 {
          animation-delay: 600ms;
        }
        
        .animation-delay-900 {
          animation-delay: 900ms;
        }
        
        .animation-delay-1200 {
          animation-delay: 1200ms;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        `}
      </style>
    </div>
  );
};

export default Home;