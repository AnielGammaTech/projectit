import { motion, AnimatePresence } from 'framer-motion';

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.2, ease: 'easeOut' } }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function AnimatedList({ items, keyExtractor, renderItem, className }) {
  return (
    <AnimatePresence mode="popLayout">
      <div className={className}>
        {items.map((item, index) => (
          <motion.div key={keyExtractor(item)} custom={index} variants={itemVariants} initial="hidden" animate="visible" exit="exit" layout>
            {renderItem(item, index)}
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}
