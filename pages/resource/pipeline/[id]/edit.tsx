import React, { useCallback, useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";

import { Button, DotIcon, majorScale, Pane, Spinner, TickCircleIcon, toaster } from "evergreen-ui";

import { Editor, Focus, reduce } from "react-dataflow-editor";

import api from "next-rest/client";

import { useDebouncedCallback } from "use-debounce";

import type { JsonObject, ValidationError } from "@underlay/pipeline";

import { BlockEditor, PipelinePageFrame, PipelineValidationReport } from "components";

import { getResourcePagePermissions } from "utils/server/permissions";
import { selectResourcePageProps, prisma, serializeUpdatedAt } from "utils/server/prisma";
import { PipelinePageProps, ResourcePageParams, getProfileSlug } from "utils/shared/propTypes";
import {
	CollectionTargetContext,
	CollectionTarget,
	LocationContext,
	useStateRef,
} from "utils/client/hooks";
import {
	PipelineSchema,
	PipelineEditorAction,
	PipelineBlocks,
	PipelineGraph,
	reduceState,
} from "utils/shared/pipeline";

import {
	pipelineBlocks,
	pipelineGraph,
	validatePipelineGraph,
	emptyGraph,
} from "utils/server/pipeline";

type PipelineEditProps = PipelinePageProps & {
	pipeline: { graph: PipelineGraph };
	errors: ValidationError[];
	blocks: PipelineBlocks;
	targets: CollectionTarget[];
};

export const getServerSideProps: GetServerSideProps<PipelineEditProps, ResourcePageParams> = async (
	context
) => {
	const { id } = context.params!;

	const pipelineWithGraph = await prisma.pipeline.findFirst({
		where: { id },
		select: { ...selectResourcePageProps, graph: true },
	});

	// The reason to check if pipeline === null separately from getResourcePagePermissions
	// is so that TypeScript know it's not null afterward
	if (pipelineWithGraph === null) {
		return { notFound: true };
	} else if (!getResourcePagePermissions(context, pipelineWithGraph, true)) {
		return { notFound: true };
	}

	// This needs to be replaced with logic to select all the
	// collections that the pipeline agent is allowed to push to
	const targets = await prisma.collection.findMany({
		where: { agentId: pipelineWithGraph.agent.id },
		select: {
			id: true,
			slug: true,
			lastVersion: { select: { id: true, versionNumber: true } },
		},
	});

	const { graph: graphValue, ...pipeline } = serializeUpdatedAt(pipelineWithGraph);
	const graph = pipelineGraph.is(graphValue) ? graphValue : emptyGraph;

	const errors = await validatePipelineGraph(graph);

	return { props: { pipeline: { ...pipeline, graph }, errors, targets, blocks: pipelineBlocks } };
};

const PipelineEditPage: React.FC<PipelineEditProps> = (props) => {
	const profileSlug = getProfileSlug(props.pipeline.agent) || "";
	const contentSlug = props.pipeline.slug;

	return (
		<LocationContext.Provider value={{ profileSlug, contentSlug, mode: "edit" }}>
			<CollectionTargetContext.Provider value={{ profileSlug, targets: props.targets }}>
				<PipelinePageFrame {...props}>
					<PipelineEditContent {...props} />
				</PipelinePageFrame>
			</CollectionTargetContext.Provider>
		</LocationContext.Provider>
	);
};

function PipelineEditContent(props: PipelineEditProps) {
	const router = useRouter();

	const [saving, setSaving] = useState(false);
	const [executing, setExecuting] = useState(false);
	const [clean, setClean, cleanRef] = useStateRef(true);
	const [graph, setGraph, graphRef] = useStateRef<PipelineGraph>(props.pipeline.graph);
	const [focus, setFocus, focusRef] = useStateRef<Focus | null>(null);

	const updateGraph = useCallback((graph: Partial<PipelineGraph>) => {
		setClean(false);
		setGraph({ ...graphRef.current, ...graph });
	}, []);

	const [errors, setErrors, errorsRef] = useStateRef<ValidationError[]>(props.errors);

	const save = useDebouncedCallback((graph: PipelineGraph) => {
		setClean(true);
		setSaving(true);
		api.put(
			"/api/pipeline/[id]",
			{ id: props.pipeline.id },
			{ "content-type": "application/json" },
			graph
		)
			.then(([{}, result]) => setErrors(result || []))
			.catch((err) => {
				console.error(err);
				toaster.danger("Could not save pipeline");
			})
			.finally(() => setSaving(false));
	}, 1000);

	useEffect(() => {
		if (graph !== props.pipeline.graph) {
			save(graph);
		}
	}, [graph]);

	useEffect(() => {
		function handleBeforeUnload(event: BeforeUnloadEvent) {
			if (cleanRef.current === false) {
				event.preventDefault();
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "s" && event.metaKey) {
				event.preventDefault();
				if (cleanRef.current === false) {
					save.flush();
				}
			}
		}

		window.addEventListener("beforeunload", handleBeforeUnload);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const dispatch = useCallback((action: PipelineEditorAction) => {
		if (action.type === "focus") {
			setFocus(action.subject);
		} else {
			const { edges, focus, nodes } = reduce(
				props.blocks,
				{
					nodes: graphRef.current.nodes,
					edges: graphRef.current.edges,
					focus: focusRef.current,
				},
				action
			);

			const state = reduceState(props.blocks, graphRef.current.state, action);
			setGraph({ nodes, edges, state });
			setFocus(focus);
			setClean(false);
		}
	}, []);

	const setState = useCallback((id: string, value: Partial<JsonObject>) => {
		const { state } = graphRef.current;
		updateGraph({ state: { ...state, [id]: { ...state[id], ...value } } });
	}, []);

	const handleExecute = useCallback(() => {
		if (errorsRef.current.length > 0) {
			return;
		}

		setExecuting(true);

		api.post("/api/pipeline/[id]", { id: props.pipeline.id }, {}, undefined)
			.then(([{ location }]) => router.push(location))
			.catch((err) => {
				console.error(err);
				toaster.danger("Could not start execution");
				setExecuting(false);
			});
	}, []);

	return (
		<>
			<Pane marginY={majorScale(2)}>
				<Editor<PipelineSchema>
					kinds={props.blocks}
					state={{ nodes: graph.nodes, edges: graph.edges, focus }}
					dispatch={dispatch}
				/>
				{focus !== null && (
					<ElementFocusPanel
						key={`${focus.element}:${focus.id}`}
						focus={focus}
						graph={graph}
						setState={setState}
					/>
				)}
				<PipelineValidationReport errors={errors} />
			</Pane>
			<Pane marginY={majorScale(4)} display="flex" justifyContent="space-between">
				<Button
					disabled={clean}
					onClick={save.flush}
					iconAfter={saving ? <Spinner /> : clean ? <TickCircleIcon /> : <DotIcon />}
				>
					{saving ? "Saving..." : clean ? "Saved" : "Save"}
				</Button>
				<Button
					appearance="primary"
					intent="success"
					disabled={!clean || executing || errors.length > 0}
					onClick={handleExecute}
					iconAfter={executing ? <Spinner /> : undefined}
				>
					Execute pipeline
				</Button>
			</Pane>
		</>
	);
}

interface ElementFocusPanelProps {
	focus: Focus;
	graph: PipelineGraph;
	setState: (id: string, state: Partial<JsonObject>) => void;
}

function ElementFocusPanel(props: ElementFocusPanelProps) {
	if (props.focus.element === "node") {
		return <BlockEditor id={props.focus.id} graph={props.graph} setState={props.setState} />;
	}
	return null;
}

export default PipelineEditPage;
