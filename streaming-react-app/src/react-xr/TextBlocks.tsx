import {JSX, useEffect, useRef, useState} from 'react';
import robotoFontFamilyJson from '../assets/RobotoMono-Regular-msdf.json?url';
import robotoFontTexture from '../assets/RobotoMono-Regular.png';
import ThreeMeshUIText, {ThreeMeshUITextType} from './ThreeMeshUIText';
import {getURLParams} from '../URLParams';
import {CURSOR_BLINK_INTERVAL_MS} from '../cursorBlinkInterval';

const NUM_LINES = 3;

export const CHARS_PER_LINE = 37;
const MAX_WIDTH = 0.89;
const CHAR_WIDTH = 0.0235;
const Y_COORD_START = -0.38;
const Z_COORD = -1.3;
const LINE_HEIGHT = 0.062;
const BLOCK_SPACING = 0.02;
const FONT_SIZE = 0.038;

const SCROLL_Y_DELTA = 0.001;

// Overlay an extra block for padding due to inflexibilities of native padding
const OFFSET = 0.01;
const OFFSET_WIDTH = OFFSET * 3;

type Props = {
  content: string;
  // The actual position or end position when animating
  y: number;
  // The start position when animating
  startY: number;
  width: number;
  height: number;
  textOpacity: number;
  backgroundOpacity: number;
  // Use this to keep track of sentence + line position for animation
  index: string;
  enableAnimation: boolean;
};

function TextBlock({
  content,
  y,
  startY,
  width,
  height,
  textOpacity,
  backgroundOpacity,
  index,
  enableAnimation,
}: Props) {
  const [scrollY, setScrollY] = useState<number>(y);

  // We are reusing text blocks so this keeps track of when we changed rows so we can restart animation
  const lastIndex = useRef<string>(index);
  useEffect(() => {
    if (index != lastIndex.current) {
      lastIndex.current = index;
      enableAnimation && setScrollY(startY);
    } else if (scrollY < y) {
      setScrollY((prev) => prev + SCROLL_Y_DELTA);
    }
  }, [enableAnimation, index, scrollY, setScrollY, startY, y]);

  // This is needed to update text content (doesn't work if we just update the content prop)
  const textRef = useRef<ThreeMeshUITextType>();
  useEffect(() => {
    if (textRef.current != null) {
      textRef.current.set({content});
    }
  }, [content, textRef, y, startY]);

  // Width starts from 0 and goes 1/2 in each direction
  const xPosition = width / 2 - MAX_WIDTH / 2 + OFFSET_WIDTH;
  return (
    <>
      <block
        args={[
          {
            backgroundOpacity,
            width: width + OFFSET_WIDTH,
            height: height,
            borderRadius: 0,
          },
        ]}
        position={[-OFFSET_WIDTH + xPosition, scrollY, Z_COORD]}></block>
      <block
        args={[{padding: 0, backgroundOpacity: 0, width, height}]}
        position={[xPosition, scrollY + OFFSET, Z_COORD]}>
        <block
          args={[
            {
              width,
              height,
              fontSize: FONT_SIZE,
              textAlign: 'left',
              backgroundOpacity: 0,
              // TODO: support more language charsets
              // This renders using MSDF format supported in WebGL. Renderable characters are defined in the "charset" json
              // Currently supports most default keyboard inputs but this would exclude many non latin charset based languages.
              // You can use https://msdf-bmfont.donmccurdy.com/ for easily generating these files
              // fontFamily: '/src/assets/Roboto-msdf.json',
              // fontTexture: '/src/assets/Roboto-msdf.png'
              fontFamily: robotoFontFamilyJson,
              fontTexture: robotoFontTexture,
            },
          ]}>
          <ThreeMeshUIText ref={textRef} content="" fontOpacity={textOpacity} />
        </block>
      </block>
    </>
  );
}

// Background behind the text so it covers any missing spaces
function TranscriptionPanel() {
  const panelHeight = LINE_HEIGHT * NUM_LINES + 2 * BLOCK_SPACING + 2 * OFFSET;
  const xPosition = OFFSET_WIDTH;
  return (
    <block
      args={[
        {
          backgroundOpacity: 1,
          width:
            MAX_WIDTH * ((CHARS_PER_LINE + 2) / CHARS_PER_LINE) +
            2 * OFFSET_WIDTH,
          height: panelHeight,
          borderRadius: 0,
        },
      ]}
      position={[
        -OFFSET + xPosition,
        Y_COORD_START + panelHeight / 2 - 2 * OFFSET,
        Z_COORD,
      ]}></block>
  );
}

export default function TextBlocks({
  sentences,
  blinkCursor,
}: {
  sentences: string[][];
  blinkCursor: boolean;
}) {
  const showTranscriptionPanel =
    getURLParams().ARTranscriptionType === 'lines_with_background';
  const textBlocks: JSX.Element[] = [];

  const [cursorBlinkOn, setCursorBlinkOn] = useState(false);
  useEffect(() => {
    if (blinkCursor) {
      const interval = setInterval(() => {
        setCursorBlinkOn((prev) => !prev);
      }, CURSOR_BLINK_INTERVAL_MS);

      return () => clearInterval(interval);
    } else {
      setCursorBlinkOn(false);
    }
  }, [blinkCursor]);

  // Start from bottom and populate most recent sentences by line until we fill max lines.
  let currentY = Y_COORD_START;
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentenceLines = sentences[i];
    for (let j = sentenceLines.length - 1; j >= 0; j--) {
      if (textBlocks.length == NUM_LINES) {
        if (showTranscriptionPanel) {
          textBlocks.push(<TranscriptionPanel key={textBlocks.length} />);
        }
        return textBlocks;
      }

      const isBottomSentence = i === sentences.length - 1;
      const isBottomLine = isBottomSentence && textBlocks.length === 0;
      const y = currentY + LINE_HEIGHT / 2;
      let textBlockLine = sentenceLines[j];
      const numChars = textBlockLine.length;

      if (cursorBlinkOn && isBottomLine) {
        textBlockLine = textBlockLine + '|';
      }

      // Accounting for potential cursor for block width (the +1)
      const blockWidth =
        (numChars + (isBottomLine ? 1.1 : 0) + (numChars < 10 ? 1 : 0)) *
        CHAR_WIDTH;
      const textOpacity = 1 - 0.1 * textBlocks.length;
      textBlocks.push(
        <TextBlock
          key={textBlocks.length}
          y={y}
          startY={currentY}
          index={`${sentences.length - i},${j}`}
          textOpacity={textOpacity}
          backgroundOpacity={0.98}
          height={LINE_HEIGHT}
          width={blockWidth}
          // content={"BLOCK " + textBlocks.length + ": " + content}
          content={textBlockLine}
          enableAnimation={!isBottomLine}
        />,
      );

      currentY = y + LINE_HEIGHT / 2;
    }
    currentY += showTranscriptionPanel ? BLOCK_SPACING / 3 : BLOCK_SPACING;
  }

  const numRemainingBlocks = textBlocks.length - NUM_LINES;
  if (numRemainingBlocks > 0) {
    Array.from({length: numRemainingBlocks}).forEach(() => {
      // Push in non display blocks because mesh UI crashes if elements are add / removed from screen.
      textBlocks.push(
        <TextBlock
          key={textBlocks.length}
          y={Y_COORD_START}
          startY={0}
          index="0,0"
          textOpacity={0}
          backgroundOpacity={0}
          enableAnimation={false}
          width={MAX_WIDTH}
          height={LINE_HEIGHT}
          content=""
        />,
      );
    });
  }

  if (showTranscriptionPanel) {
    textBlocks.push(<TranscriptionPanel key={textBlocks.length} />);
  }
  return textBlocks;
}
