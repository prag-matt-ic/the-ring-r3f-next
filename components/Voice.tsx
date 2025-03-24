"use client";
import { ElevenLabsClient, play } from "elevenlabs";
import React, { type FC, useEffect, useRef, useState } from "react";

import useAudioStore from "@/hooks/useAudioStore";

const client = new ElevenLabsClient({
  apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
});

type Props = {
  name: string | undefined;
};

const Voice: FC<Props> = ({ name }) => {
  const isPlayingAudio = useAudioStore((state) => state.isPlaying);
  const setIsPlayingAudio = useAudioStore((state) => state.setIsPlaying);

  const isGenerating = useRef(false);

  const [audioUrl, setAudioUrl] = useState<string>();
  const [audioEl, setAudioEl] = useState<HTMLAudioElement>();

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const generateAudio = async () => {
      if (!name) return;
      if (isGenerating.current) return;
      isGenerating.current = true;

      try {
        const voiceId = "okjpyUAPC0XFzPokO5Be";
        const text = `${name}... you're the kerisha ${name}'s. Nah ${name}, we are the things that others fear. HELP ME ${name}!`;
        const audioStream = await client.textToSpeech.convert(voiceId, {
          text: text,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
          voice_settings: {
            speed: 1.0,
          },
        });
        console.log({ audioStream });

        // await play(audioStream);
        // Collect the streaming chunks into an array
        const chunks: Uint8Array[] = [];
        for await (const chunk of audioStream) {
          chunks.push(chunk);
        }
        // Combine all chunks into a Blob of type 'audio/mp3'.
        const blob = new Blob(chunks, { type: "audio/mp3" });
        console.log({ chunks, blob });
        // Create an object URL from the Blob.
        const url = URL.createObjectURL(blob);
        console.log({ url });
        alert("has audio");
        setAudioUrl(url);
      } catch (e) {
        console.error("error generating audio", e);
      }
    };

    generateAudio();
  }, [name]);

  useEffect(() => {
    if (!audioUrl) return;
    // Create audio element, set properties, and load
    const audioEl = new Audio(audioUrl);
    audioEl.loop = true;
    audioEl.autoplay = false;
    audioEl.muted = true;
    audioEl.volume = 1;
    audioEl.addEventListener("error", (e) => console.error("audio error", e));
    audioEl.load();
    setAudioEl(audioEl);

    return () => {
      audioEl.remove();
      audioEl.pause();
    };
  }, [audioUrl]);

  // const {} = useControls();

  // Set up the Web Audio API with a distortion effect.
  useEffect(() => {
    if (!audioEl) return;

    // Create a new AudioContext, which is the main container for all audio processing.
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    // Create a MediaElementSource from the audio element.
    // This node serves as the source of audio from an existing HTMLAudioElement.
    const sourceNode = audioContext.createMediaElementSource(audioEl);
    sourceRef.current = sourceNode;

    // Create a DelayNode to add an echo effect.
    const delayNode = audioContext.createDelay();
    // Increase the delay time slightly for a more noticeable echo.
    delayNode.delayTime.value = 0.4; // 500 ms delay

    // Create a GainNode to control the feedback level.
    // This node feeds the delayed signal back into the delay for repeated echoes.
    const feedbackGain = audioContext.createGain();
    feedbackGain.gain.value = 0.3; // Adjust this value to control the echo intensity

    // Create a GainNode for the wet (echo) signal.
    // This lets you control how much of the echo is mixed with the original sound.
    const wetGain = audioContext.createGain();
    wetGain.gain.value = 0.2; // Higher value for a stronger echo effect

    // Create a GainNode for the dry (original) signal.
    const dryGain = audioContext.createGain();
    dryGain.gain.value = 0.6; // Adjust to balance with the wet signal

    // Split the filtered signal into dry and wet paths.
    // Connect the filter output to both delay (wet) and directly to destination (dry).
    sourceNode.connect(dryGain);
    dryGain.connect(audioContext.destination);

    // Connect the filter output to the delay node.
    sourceNode.connect(delayNode);

    // Connect the delay node to the wet gain.
    delayNode.connect(wetGain);
    wetGain.connect(audioContext.destination);

    // Set up the feedback loop: feed a portion of the delayed signal back into the delay node.
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);

    delayNode.connect(audioContext.destination);

    // Cleanup function: disconnect all nodes and close the AudioContext when the component unmounts.
    return () => {
      sourceNode.disconnect();
      delayNode.disconnect();
      audioContext.close();
    };
  }, [audioEl]);

  useEffect(() => {
    if (!audioEl) return;
    if (isPlayingAudio) {
      // Resume the audio context if it is suspended (browsers often require a user gesture).
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
      audioEl.currentTime = 0;
      audioEl.muted = false;
      audioEl.play();
    } else {
      audioEl.pause();
    }
  }, [audioEl, isPlayingAudio]);

  useEffect(() => {
    if (!audioEl || !isPlayingAudio) return;

    let requestId: number;
    const startTime = performance.now();
    const period = 6; // oscillation period in seconds

    const updatePlaybackRate = () => {
      const now = performance.now();
      const t = (now - startTime) / 1000; // time in seconds
      // Calculate playback rate oscillating between 0.7 and 1.5
      const playbackRate = 1.1 + 0.6 * Math.sin((2 * Math.PI * t) / period);
      const volume = 0.5 + 0.4 * Math.sin((2 * Math.PI * t) / period);
      audioEl.playbackRate = playbackRate;
      audioEl.volume = volume;
      requestId = requestAnimationFrame(updatePlaybackRate);
    };

    requestId = requestAnimationFrame(updatePlaybackRate);

    return () => cancelAnimationFrame(requestId);
  }, [audioEl, isPlayingAudio]);

  return (
    <>
      <button
        className="z-50 fixed top-8 right-8 text-8xl text-light"
        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
      >
        {isPlayingAudio ? "Mute" : "Play Voice"}
      </button>
    </>
  );
};

export default Voice;
