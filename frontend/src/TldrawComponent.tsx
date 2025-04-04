import {
  TLShapeId,
  Tldraw,
  createShapeId,
  toRichText,
  Editor,
} from "tldraw";
import "tldraw/tldraw.css";
import { useRef, useState } from "react";

export default function TldrawComponent() {
  console.log("TldrawComponent rendered");
  const editorRef = useRef<Editor | null>(null);
  const [spokeCount, setSpokeCount] = useState(3);

  const onMount = (editor: Editor) => {
    console.log("Editor mounted:", editor);
    editorRef.current = editor;
    const hubId = createShapeId("hub");

    // Create the hub shape.
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

    // Create initial spokes.
    createSpokes(spokeCount);

    // Register a change handler to update spokes when the hub or a label moves.
    editor.on("change", () => {
      const hubShape = editor.getShape(hubId);
      if (!hubShape) return;

      // Get hub center
      const hubCenterX = hubShape.x + hubShape.props.w / 2;
      const hubCenterY = hubShape.y + hubShape.props.h / 2;
      const circleRadius = hubShape.props.w / 2;

      // Filter out text (label) shapes and arrow (spoke) shapes.
      const textShapes = editor.getCurrentPageShapes().filter((shape) => 
        String(shape.id).includes("label-")
      );
      
      const arrowShapes = editor.getCurrentPageShapes().filter((shape) => 
        String(shape.id).includes("spoke-")
      );

      // Update each arrow to connect from hub edge to label
      textShapes.forEach((textShape) => {
        const textIndex = String(textShape.id).split("-")[1];
        const matchingArrow = arrowShapes.find((arrow) =>
          String(arrow.id).includes(`spoke-${textIndex}`)
        );

        if (matchingArrow) {
          // Calculate angle from hub center to text
          const angle = Math.atan2(
            textShape.y - hubCenterY, 
            textShape.x - hubCenterX
          );

          // Calculate the point on the edge of the circle
          const edgeX = hubCenterX + circleRadius * Math.cos(angle);
          const edgeY = hubCenterY + circleRadius * Math.sin(angle);

          // Update the arrow
          editor.updateShape({
            id: matchingArrow.id,
            props: {
              start: { x: edgeX, y: edgeY },
              end: { x: textShape.x, y: textShape.y },
            },
            type: ""
          });
        }
      });
    });
  };

  // Collision prevention for label positions.
  const preventCollisions = (
    positions: { index: number; x: number; y: number }[],
    circleCenter: { x: number; y: number },
    radius: number
  ) => {
    const minDistance = 70;
    let adjusted = [...positions];

    const iterations = 50;
    for (let iter = 0; iter < iterations; iter++) {
      let moved = false;
      for (let i = 0; i < adjusted.length; i++) {
        for (let j = i + 1; j < adjusted.length; j++) {
          const pos1 = adjusted[i];
          const pos2 = adjusted[j];
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance) {
            moved = true;
            const pos1Angle = Math.atan2(pos1.y - circleCenter.y, pos1.x - circleCenter.x);
            const pos2Angle = Math.atan2(pos2.y - circleCenter.y, pos2.x - circleCenter.x);
            const adjustAngle = 0.05;
            const angleDiff = ((pos2Angle - pos1Angle) + 2 * Math.PI) % (2 * Math.PI);
            let pos1NewAngle, pos2NewAngle;
            if (angleDiff < Math.PI) {
              pos1NewAngle = pos1Angle - adjustAngle;
              pos2NewAngle = pos2Angle + adjustAngle;
            } else {
              pos1NewAngle = pos1Angle + adjustAngle;
              pos2NewAngle = pos2Angle - adjustAngle;
            }
            adjusted[i] = {
              ...pos1,
              x: circleCenter.x + radius * Math.cos(pos1NewAngle),
              y: circleCenter.y + radius * Math.sin(pos1NewAngle),
            };
            adjusted[j] = {
              ...pos2,
              x: circleCenter.x + radius * Math.cos(pos2NewAngle),
              y: circleCenter.y + radius * Math.sin(pos2NewAngle),
            };
          }
        }
      }
      if (!moved) break;
    }
    return adjusted;
  };

  // Create spokes and label positions.
  const createSpokes = (count: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    
    // Remove any existing spokes and labels.
    const existing = editor.getCurrentPageShapes().filter((s) => {
      const idStr = String(s.id);
      return idStr.includes("spoke") || idStr.includes("label");
    });
    
    for (const shape of existing) {
      editor.deleteShape(shape.id);
    }
    
    const hubShape = editor.getCurrentPageShapes().find((s) => 
      String(s.id).includes("hub")
    );
    
    if (!hubShape) return;
    
    const centerX = hubShape.x + hubShape.props.w / 2;
    const centerY = hubShape.y + hubShape.props.h / 2;
    const circleRadius = hubShape.props.w / 2;
    const spokeRadius = 150;
    
    let labelPositions: { index: number; x: number; y: number }[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      const labelX = centerX + spokeRadius * Math.cos(angle);
      const labelY = centerY + spokeRadius * Math.sin(angle);
      labelPositions.push({ index: i, x: labelX, y: labelY });
    }
    
    if (count > 2) {
      labelPositions = preventCollisions(
        labelPositions, 
        { x: centerX, y: centerY }, 
        spokeRadius
      );
    }
    
    for (let i = 0; i < count; i++) {
      const position = labelPositions[i];
      const angle = Math.atan2(position.y - centerY, position.x - centerX);
      const edgeX = centerX + circleRadius * Math.cos(angle);
      const edgeY = centerY + circleRadius * Math.sin(angle);
      
      const labelId = createShapeId(`label-${i}`);
      const spokeId = createShapeId(`spoke-${i}`);
      
      editor.createShape({
        id: labelId,
        type: "text",
        x: position.x,
        y: position.y,
        props: {
          richText: toRichText(`Spoke ${i + 1}`),
        },
      });
      
      editor.createShape({
        id: spokeId,
        type: "arrow",
        x: 0,
        y: 0,
        props: {
          start: { x: edgeX, y: edgeY },
          end: { x: position.x, y: position.y },
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
        <Tldraw hideUi = {true} onMount={onMount} />
      </div>
    </div>
  );
}