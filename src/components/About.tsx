import React from 'react';
import { Laptop, Palette, Gauge } from 'lucide-react';

const AboutCard = ({ icon: Icon, title, description }: { 
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex-1 min-w-[280px] bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-xl shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl group">
    <Icon className="w-8 h-8 text-yellow-400 mb-4 group-hover:scale-110 transition-transform duration-300" />
    <h2 className="text-white text-xl font-bold mb-3">{title}</h2>
    <p className="text-gray-300 leading-relaxed">{description}</p>
  </div>
);

const About = () => {
  const features = [
    {
      icon: Laptop,
      title: "AI-Powered Simplicity",
      description: "Share your goals, and our advanced AI crafts a personalized website tailored to your needs."
    },
    {
      icon: Palette,
      title: "Creative Freedom",
      description: "Customize every detail to make your site truly yours, with intuitive tools and templates."
    },
    {
      icon: Gauge,
      title: "Speed and Efficiency",
      description: "Launch your website faster than ever without compromising on quality or creativity."
    }
  ];

  return (
    <div id="about" className="py-20 px-6 md:px-10 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">About Us</h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-6">
            Transforming Ideas into Websites, Seamlessly
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <AboutCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;