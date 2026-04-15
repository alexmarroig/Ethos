const EthosLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };
  return (
    <span className={`font-display font-bold tracking-tight ${sizes[size]}`} style={{ fontFamily: "'DM Serif Display', serif" }}>
      <span style={{ color: "#2F6F73" }}>E</span>
      <span style={{ color: "#EDF2F7" }}>THOS</span>
    </span>
  );
};

export default EthosLogo;
