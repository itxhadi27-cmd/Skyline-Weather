import { useEffect, useState } from 'react';
import styles from './Toast.module.css';

interface Props {
  message: string;
  visible: boolean;
}

export default function Toast({ message, visible }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) setShow(true);
    else {
      const t = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div className={`${styles.toast} ${visible ? styles.in : styles.out}`}>
      {message}
    </div>
  );
}
