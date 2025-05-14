import React from "react";

const EmbedGame = ({ url, title }) => {
  return (
    <div className="w-full h-[500px]">
      <iframe
        src={url}
        title={title}
        width="100%"
        height="100%"
        className="rounded border"
        allowFullScreen
      />
    </div>
  );
};

export default EmbedGame;
