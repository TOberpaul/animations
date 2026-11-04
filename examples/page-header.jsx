import React from 'react';

// Shared page introduction for documentation and component galleries.
export function PageHeader({title,children}){
 return <header className="page-header"><p className="page-header-eyebrow">MOTION LIBRARY</p><h1>{title}</h1><p className="page-header-description">{children}</p></header>;
}
