import AdPlaceholder from "./AdPlaceholder";

interface InContentAdMiddleProps {
  googleAdSlot?: string;
  googleAdClient?: string;
  className?: string;
}

const InContentAdMiddle = ({ 
  googleAdSlot, 
  googleAdClient,
  className = "" 
}: InContentAdMiddleProps) => {
  return (
    <div className={`my-6 ${className}`}>
      <AdPlaceholder
        googleAdSlot={googleAdSlot}
        googleAdClient={googleAdClient}
        adType="in-content"
      />
    </div>
  );
};

export default InContentAdMiddle;
