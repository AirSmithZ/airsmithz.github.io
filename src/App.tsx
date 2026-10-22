import { useState } from 'react';
import { isPhoneClient } from './device';
import { DesktopApp } from './DesktopApp';
import { PhoneApp } from './PhoneApp';
import { useStayOnPage } from './portraitGestures';

export function App() {
  const [phone] = useState(isPhoneClient);
  useStayOnPage();
  return phone ? <PhoneApp /> : <DesktopApp />;
}
