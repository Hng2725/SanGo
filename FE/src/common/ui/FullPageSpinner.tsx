import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { BrandLogo } from './BrandLogo';
export function FullPageSpinner() { const [visible, setVisible] = useState(false); useEffect(() => { const timer = setTimeout(() => setVisible(true), 300); return () => clearTimeout(timer); }, []); return visible ? <div className="full-page-spinner"><BrandLogo /><Spin size="small" /></div> : null; }
