import { useEffect, useState } from 'react';
import './PhoneFrame.css';

/**
 * A phone bezel, on desktop only.
 *
 * On a real phone this component gets out of the way entirely: the panel fills
 * the viewport and, once added to the home screen, runs with no browser chrome
 * at all. The bezel exists so the same URL reads correctly on a laptop, which
 * is where it will be reviewed.
 */
function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    const update = () => setStandalone(mq.matches || iosStandalone);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return standalone;
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const standalone = useStandalone();
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 620px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (standalone || narrow) {
    return <div className="bare">{children}</div>;
  }

  return (
    <div className="stage">
      <div className="bezel">
        <div className="notch" />
        <div className="screen">{children}</div>
      </div>
    </div>
  );
}
