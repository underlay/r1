import React from "react";

import { CollectionPreview } from "components";
import { Collection } from "components/CollectionPreview/CollectionPreview";

import styles from "./CollectionList.module.scss";

type Props = {
	collections: Collection[];
};

const PackageList: React.FC<Props> = function ({ collections }) {
	return (
		<div>
			{collections.map((collection) => {
				return (
					<CollectionPreview
						key={collection.slug}
						className={styles.collection}
						{...collection}
					/>
				);
			})}
		</div>
	);
};

export default PackageList;
