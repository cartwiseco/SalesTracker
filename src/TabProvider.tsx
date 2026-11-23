import React, { createContext, useContext, useState, ReactNode } from 'react';

export const TabContext = createContext<{ active: string; setActive: (tab: string) => void }>({
  active: 'home',
  setActive: () => {},
});

const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [active, setActive] = useState('home');
  return (
    <TabContext.Provider value={{ active, setActive }}>{children}</TabContext.Provider>
  );
};

export default TabProvider;
