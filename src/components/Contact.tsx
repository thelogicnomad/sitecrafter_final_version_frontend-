import React, { useState } from 'react';
import { Send, User, Mail, MessageSquare, CheckCircle } from 'lucide-react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface InputFieldProps {
  label: string;
  icon: React.ElementType;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  name: string;
}

const InputField = ({ 
  label, 
  icon: Icon, 
  type = 'text', 
  placeholder,
  value,
  onChange,
  name
}: InputFieldProps) => (
  <div className="space-y-1">
    <label className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
      <Icon className="w-4 h-4 text-gray-600" />
      <span>{label}</span>
    </label>
    {type === 'textarea' ? (
      <textarea
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all duration-300 outline-none resize-none h-24"
      />
    ) : (
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all duration-300 outline-none"
      />
    )}
  </div>
);

const Contact = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError('All fields are required');
      return;
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    }, 1500);
  };

  return (
    <div id="contact" className="py-16 px-6 md:px-10 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Get in Touch</h2>
          <p className="text-gray-600">We'd love to hear from you. Send us a message!</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="hidden md:block">
            <img 
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80"
              alt="Contact"
              className="rounded-xl shadow-xl transform transition-all duration-500 hover:scale-105"
            />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
            {isSubmitted ? (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
                <h3 className="text-2xl font-bold text-gray-800">Thank You!</h3>
                <p className="text-gray-600">Your message has been sent successfully. We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <InputField 
                  label="NAME"
                  icon={User}
                  placeholder="Name"
                  value={formData.name}
                  onChange={handleChange}
                  name="name"
                />
                <InputField 
                  label="EMAIL"
                  icon={Mail}
                  type="email"
                  placeholder="youremail@gmail.com"
                  value={formData.email}
                  onChange={handleChange}
                  name="email"
                />
                <InputField 
                  label="MESSAGE"
                  icon={MessageSquare}
                  type="textarea"
                  placeholder="Your message here..."
                  value={formData.message}
                  onChange={handleChange}
                  name="message"
                />
                
                {error && (
                  <div className="text-red-500 text-sm py-1">{error}</div>
                )}
                
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full rounded-lg py-3 flex items-center justify-center space-x-2 transition-all duration-300 shadow-md hover:shadow-lg ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;