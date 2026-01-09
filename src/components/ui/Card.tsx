import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'bordered' | 'glass';
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    variant = 'default'
}) => {
    const variants = {
        default: 'bg-[#141414]',
        bordered: 'bg-[#141414] border border-[#2e2e2e]',
        glass: 'bg-[#141414]/80 backdrop-blur-sm border border-[#2e2e2e]/50'
    };

    return (
        <div className={`rounded-xl ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
};
