
"use client";

import { Player } from "@remotion/player";
import { MyComposition } from "./RemotionVideo";

export const VideoPlayer = () => {
    return (
        <div className="rounded-2xl overflow-hidden shadow-2xl">
            <Player
                component={MyComposition}
                durationInFrames={120}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                style={{
                    width: '100%',
                    height: 'auto',
                    aspectRatio: '16/9',
                }}
                controls
            />
        </div>
    );
};
