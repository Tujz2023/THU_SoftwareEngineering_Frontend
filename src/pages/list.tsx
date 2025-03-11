import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { DELETE_SUCCESS, FAILURE_PREFIX } from "../constants/string";
import { request } from "../utils/network";
import { BoardMetaData } from "../utils/types";
import { RootState } from "../redux/store";
import { useSelector } from "react-redux";

const ListScreen = () => {
    /**
     * @todo [Step 5] 请在下述一处代码缺失部分填写合适的代码，完成游戏记录列表页面 UI
     * @todo [Step 6] 请在下述一处代码缺失部分填写合适的代码，完成网络请求的管理
     */
    const userName = useSelector((state: RootState) => state.auth.name);

    const [refreshing, setRefreshing] = useState(true);
    const [selectedUserName, setSelectedUserName] = useState<string | undefined>(undefined);
    const [boardList, setBoardList] = useState<BoardMetaData[]>([]);

    const router = useRouter();
    const query = router.query;

    useEffect(() => {
        if (!router.isReady) {
            return;
        }

        const name = router.query.name && decodeURIComponent(router.query.name as string);
        setSelectedUserName(name);
        fetchList(name);
    }, [router, query]);

    const fetchList = (name?: string) => {
        setRefreshing(true);
        request(name ? `/api/user/${name}` : "/api/boards", "GET", false)
            .then((res) => setBoardList(res.boards))
            .catch((err) => alert(FAILURE_PREFIX + err))
            .finally(() => setRefreshing(false));
    };

    const deleteBoard = (id: number) => {
        // Step 6 BEGIN
        request(`/api/boards/${id}`, "DELETE", true)
            .then(() => {
                alert(DELETE_SUCCESS);
                fetchList(selectedUserName);
            })
            .catch((err) => alert(FAILURE_PREFIX + err));
        // Step 6 END
    };

    return refreshing ? (
        <p> Loading... </p>
    ) : (
        <>
            {selectedUserName !== undefined && <h4> Boards of {selectedUserName} </h4>}
            <button onClick={() => router.push("/")}>
                Go back to free mode
            </button>
            {selectedUserName !== undefined && (
                <button onClick={() => router.push("/list")}>
                    Go to full list
                </button>
            )}
            {boardList.length === 0 ? (
                <p> Empty list. </p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>{
                    // Step 5 BEGIN
                            boardList.map((board) => (
                                <div key={board.id}>
                                    <p> ID: {board.id}</p>
                                    <p> Name: {board.boardName} </p>
                                    <p> Created by: {board.userName} </p>
                                    <p> Created at: {new Date(board.createdAt * 1000).toLocaleDateString()} </p>
                                    <button onClick={() => router.push(`/?id=${board.id}`)}>
                                        Play it
                                    </button>
                                    {userName === board.userName && (
                                        <button onClick={() => deleteBoard(board.id)}>
                                            Delete it
                                        </button>
                                    )}
                                    <button onClick={() => router.push(`/list?name=${board.userName}`)}>
                                        View this user
                                    </button>
                                </div>
                    ))
                    // Step 5 END
                }</div>
            )}
        </>
    );
};

export default ListScreen;