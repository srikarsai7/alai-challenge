import {
  Tldraw,
  createShapeId,
  toRichText,
} from "tldraw";
import "tldraw/tldraw.css";
import { useRef, useState } from "react";

export default function TldrawComponent() {
  const editorRef = useRef<any>(null);
  const [spokeCount, setSpokeCount] = useState(3); // default number of spokes

  // Called once TLDraw editor is ready
  const onMount = (editor: any) => {
    editorRef.current = editor;

    const hubId = createShapeId("hub");

    // Create central hub (a circle shape)
    editor.createShape({
      id: hubId,
      type: "geo",
      x: 250,
      y: 250,
      props: {
        geo: "ellipse",
        w: 100,
        h: 100,
        color: "blue",
        dash: "draw",
        size: "m",
      },
    });

    createSpokes(spokeCount);

    return () => {
      editor.deleteShape(hubId);
    };
  };

  const createSpokes = (count: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Center coordinates should match the hub position
    const centerX = 300; // 250 (circle x) + 50 (half of circle width)
    const centerY = 300; // 250 (circle y) + 50 (half of circle height)
    const radius = 150;

    const existing = editor.getCurrentPageShapes().filter((s: any) => {
      const idStr = String(s.id);
      return idStr.includes('spoke') || idStr.includes('label');
    });
    
    for (const shape of existing) {
      editor.deleteShape(shape.id);
    }

    // Create new spokes and labels
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      
      // Calculate positions - now starting from the edge of the circle
      const circleCenterX = 300; // center of the circle
      const circleCenterY = 300;
      const circleRadius = 50; // radius of the hub circle (100/2)
      
      // Point on the edge of the circle
      const circleEdgeX = circleCenterX + circleRadius * Math.cos(angle);
      const circleEdgeY = circleCenterY + circleRadius * Math.sin(angle);
      
      // Endpoint for the spoke
      const endX = circleCenterX + radius * Math.cos(angle);
      const endY = circleCenterY + radius * Math.sin(angle);

      const labelId = createShapeId(`label-${i}`);
      const spokeId = createShapeId(`spoke-${i}`);

      // Create text label
      editor.createShape({
        id: labelId,
        type: "text",
        x: endX,
        y: endY,
        props: {
          richText: toRichText(`Spoke ${i + 1}`),
        },
      });

      // Create arrow from edge of circle to endpoint
      editor.createShape({
        id: spokeId,
        type: "arrow",
        x: 0,
        y: 0,
        props: {
          start: { x: circleEdgeX, y: circleEdgeY },
          end: { x: endX, y: endY },
          arrowheadEnd: "arrow",
        },
      });
    }
  };

  const handleAddSpoke = () => {
    if (spokeCount < 6) {
      const newCount = spokeCount + 1;
      setSpokeCount(newCount);
      createSpokes(newCount);
    }
  };

  const handleRemoveSpoke = () => {
    if (spokeCount > 2) {
      const newCount = spokeCount - 1;
      setSpokeCount(newCount);
      createSpokes(newCount);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={handleAddSpoke} disabled={spokeCount >= 6}>
          Add Spoke
        </button>
        <button onClick={handleRemoveSpoke} disabled={spokeCount <= 2}>
          Remove Spoke
        </button>
      </div>
      <div style={{ position: "fixed", width: "90vw", height: "90vh" }}>
        <Tldraw hideUi={true} onMount={onMount} />
      </div>
    </div>
  );
}