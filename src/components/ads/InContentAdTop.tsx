import AdPlaceholder from "./AdPlaceholder";

interface InContentAdTopProps {
  googleAdSlot?: string;
  googleAdClient?: string;
  className?: string;
}

const InContentAdTop = ({ 
  googleAdSlot, 
  googleAdClient,
  className = "" 
}: InContentAdTopProps) => {
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

export default InContentAdTop;
