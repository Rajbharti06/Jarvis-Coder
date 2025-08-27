// ... existing code ...
const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black">
      <div className="w-full text-center">
        <span className="text-xs rounded-md bg-amber-500/15 text-amber-500 py-1">
          New version dropped!
        </span>
        <h1 className="text-4xl lg:text-6xl font-bold font-sans">
          <span className="text-2xl lg:text-4xl text-gray-400 block font-medium">
            I'm ready to work,
          </span>
          Ask me anything.
        </h1>
      </div>
      <img
        src="https://enzotvs-deepsite.hf.space/gold_arrow.svg" // Assuming a gold arrow SVG exists at this URL
        className="absolute bottom-8 left-0 w-[100px] transform rotate-[360deg]"
        alt="Arrow"
      />
    </div>
  );
};

export default HomePage;