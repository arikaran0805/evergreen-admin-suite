import AdPlaceholder from "./AdPlaceholder";

interface InContentAdBottomProps {
  googleAdSlot?: string;
  googleAdClient?: string;
  className?: string;
}

const InContentAdBottom = ({ 
  googleAdSlot, 
  googleAdClient,
  className = "" 
}: InContentAdBottomProps) => {
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

export default InContentAdBottom;
