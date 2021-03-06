import React from "react";
import {
	Avatar,
	Button,
	IconButton,
	majorScale,
	Menu,
	Pane,
	PlusIcon,
	Popover,
	Position,
} from "evergreen-ui";
import { signOut } from "next-auth/client";

import { usePageContext } from "utils/client/hooks";

import styles from "./Header.module.scss";

const Header: React.FC<{}> = ({}) => {
	const { session } = usePageContext();

	return (
		<nav className={styles.header}>
			<div className={styles.content}>
				<Pane>
					<Button
						className={styles.title}
						height={40}
						appearance="minimal"
						is="a"
						href="/"
					>
						<img src="/headerLogo.svg" alt="Underlay r1 logo" />
					</Button>
				</Pane>
				<Pane display="flex" alignItems="center">
					{session ? (
						<>
							<IconButton
								icon={<PlusIcon color="dark" />}
								is="a"
								href="/new"
								size="large"
								appearance="minimal"
								marginX={majorScale(2)}
							/>
							<Popover
								position={Position.BOTTOM_LEFT}
								content={
									<Menu>
										<Menu.Group>
											<Menu.Item is="a" href={`/${session.user.slug}`}>
												Profile
											</Menu.Item>
											<Menu.Item
												is="a"
												href={`/${session.user.slug}?mode=settings`}
											>
												Settings
											</Menu.Item>
										</Menu.Group>
										<Menu.Divider />
										<Menu.Group>
											<Menu.Item onSelect={() => signOut()}>
												Log out
											</Menu.Item>
										</Menu.Group>
									</Menu>
								}
							>
								<IconButton
									appearance="minimal"
									size="large"
									icon={
										<Avatar
											size={32}
											name={session.user.email}
											src={session.user.avatar || undefined}
										/>
									}
								/>
							</Popover>
						</>
					) : (
						<Button is="a" href="/login" appearance="minimal" height={40}>
							Login
						</Button>
					)}
				</Pane>
			</div>
		</nav>
	);
};

export default Header;
