import React from 'react';

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'fill'> {
    size?: number;
    fill?: boolean;
    half?: boolean;
}

const IconWrapper: React.FC<IconProps> = ({ children, size = 24, className = "", fill, half, ...props }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className} 
        {...props}
    >
        {children}
    </svg>
);

export const AppLogo = ({ className = "" }: { className?: string }) => (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="8" y="6" width="24" height="28" rx="3" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M13 6V34" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5"/>
        <path d="M18 16H28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M23 16V24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="28" cy="28" r="3" fill="#C85A5A" stroke="none" />
    </svg>
);

export const Icons = {
    Calendar: (props: IconProps) => <IconWrapper {...props}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></IconWrapper>,
    Plus: (props: IconProps) => <IconWrapper {...props}><path d="M5 12h14"/><path d="M12 5v14"/></IconWrapper>,
    PieChart: (props: IconProps) => <IconWrapper {...props}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></IconWrapper>,
    Settings: (props: IconProps) => <IconWrapper {...props}><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></IconWrapper>,
    Star: ({fill, half, className, ...props}: IconProps) => (
        <IconWrapper {...props} className={`${className || ''} ${fill ? "text-muji-ink" : "text-gray-300"}`.trim()} style={fill && half ? { fill: 'url(#half-ink)' } : (fill ? { fill: 'currentColor' } : {})}>
            {fill && half && (
                <defs>
                    <linearGradient id="half-ink" x1="0" x2="100%" y1="0" y2="0">
                        <stop offset="50%" stopColor="#BBADA2" />
                        <stop offset="50%" stopColor="#d1d5db" />
                    </linearGradient>
                </defs>
            )}
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </IconWrapper>
    ),
    Trash: (props: IconProps) => <IconWrapper {...props}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></IconWrapper>,
    Check: (props: IconProps) => <IconWrapper {...props}><polyline points="20 6 9 17 4 12"/></IconWrapper>,
    Target: (props: IconProps) => <IconWrapper {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></IconWrapper>,
    ChevronLeft: (props: IconProps) => <IconWrapper {...props}><path d="m15 18-6-6 6-6"/></IconWrapper>,
    ChevronRight: (props: IconProps) => <IconWrapper {...props}><path d="m9 18 6-6-6-6"/></IconWrapper>,
    ChevronDown: (props: IconProps) => <IconWrapper {...props}><path d="m6 9 6 6 6-6"/></IconWrapper>,
    List: (props: IconProps) => <IconWrapper {...props}><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></IconWrapper>,
    X: (props: IconProps) => <IconWrapper {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></IconWrapper>,
    ArrowLeft: (props: IconProps) => <IconWrapper {...props}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></IconWrapper>,
    Download: (props: IconProps) => <IconWrapper {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></IconWrapper>,
    AlertCircle: (props: IconProps) => <IconWrapper {...props}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></IconWrapper>,
    Edit: (props: IconProps) => <IconWrapper {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></IconWrapper>,
    Users: (props: IconProps) => <IconWrapper {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></IconWrapper>,
    ArrowUp: (props: IconProps) => <IconWrapper {...props}><path d="m18 15-6-6-6 6"/><path d="M12 9v12"/></IconWrapper>,
    ArrowDown: (props: IconProps) => <IconWrapper {...props}><path d="m6 9 6 6 6-6"/><path d="M12 3v12"/></IconWrapper>
};